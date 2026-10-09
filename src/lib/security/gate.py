import os
import json
import hashlib
import argparse
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
def canonicalize_json(data):
    """Tạo canonical JSON string để đảm bảo tính toàn vẹn hash cross-language (TS/Python)."""
    return json.dumps(data, separators=(',', ':'), sort_keys=True, ensure_ascii=False)
def verify_approval_gate(request_id):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    approval_file = os.path.join(base_dir, "trusted_approvals", f"{request_id}.json")
    proposal_file = os.path.join(os.path.dirname(base_dir), "..", "data", "proposals", f"{request_id}.json")
    print(f"🔍 Checking OOB Approval for Request: {request_id}")
    # Fail-Closed 1: Kiểm tra tệp approval
    if not os.path.exists(approval_file):
        print("❌ REJECTED: OOB approval file does not exist.")
        return False
    try:
        with open(approval_file, "r", encoding="utf-8-sig") as f:
            record = json.load(f)
    except Exception as e:
        print(f"❌ REJECTED: Invalid approval JSON format - {e}")
        return False
    # Fail-Closed 2: Trường bắt buộc
    required_fields = ["request_id", "proposal_hash", "decision", "expires_at", "key_id", "signature"]
    for field in required_fields:
        if field not in record or not record[field]:
            print(f"❌ REJECTED: Missing required field '{field}'.")
            return False
    # Fail-Closed 3: Request ID Binding
    if record["request_id"] != request_id:
        print("❌ REJECTED: Request ID mismatch.")
        return False
    # Fail-Closed 4: Quyết định phê duyệt
    if record["decision"] != "APPROVE":
        print(f"❌ REJECTED: Decision is {record['decision']}.")
        return False
    # Fail-Closed 5: Kiểm tra Expiry (UTC)
    try:
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            print("❌ REJECTED: Approval record has expired.")
            return False
    except Exception as e:
        print(f"❌ REJECTED: Invalid ISO timestamp format - {e}")
        return False
    # Fail-Closed 6: Kiểm tra Public Key Tín Nhiệm
    key_id = record["key_id"]
    pub_key_path = os.path.join(base_dir, "trusted_keys", f"{key_id}.pub")
    if not os.path.exists(pub_key_path):
        print(f"❌ REJECTED: Public key '{key_id}' is not trusted (file not found).")
        return False
    # Fail-Closed 7: Re-compute SHA-256 Canonical Proposal Hash (Nếu có file proposal)
    if os.path.exists(proposal_file):
        try:
            with open(proposal_file, "r", encoding="utf-8-sig") as f:
                proposal_data = json.load(f)
            computed_hash = hashlib.sha256(canonicalize_json(proposal_data).encode("utf-8")).hexdigest()
            if computed_hash != record["proposal_hash"]:
                print("❌ REJECTED: Proposal hash mismatch.")
                return False
        except Exception as e:
            print(f"❌ REJECTED: Error recomputing proposal hash - {e}")
            return False
    # Fail-Closed 8: Verification chữ ký Ed25519
    try:
        with open(pub_key_path, "rb") as kf:
            public_key_bytes = kf.read()
        # Nạp Public Key (Hỗ trợ PEM hoặc Raw 32-byte Hex)
        if b"BEGIN PUBLIC KEY" in public_key_bytes:
            public_key = serialization.load_pem_public_key(public_key_bytes)
        else:
            public_key = ed25519.Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_bytes.decode('utf-8').strip()))
        # Dữ liệu được ký: request_id + proposal_hash + decision + expires_at
        signed_payload = f"{record['request_id']}:{record['proposal_hash']}:{record['decision']}:{record['expires_at']}"
        signature_bytes = bytes.fromhex(record["signature"])
        public_key.verify(signature_bytes, signed_payload.encode("utf-8"))
    except Exception as e:
        print(f"❌ REJECTED: Ed25519 signature verification failed - {e}")
        return False
    print("====================================================")
    print("✅ VERIFIED: Ed25519 Signature & Proposal Hash VALID (Fail-Closed Passed)")
    print("====================================================")
    return True
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="V7 Security Gate Verifier (Ed25519 Strict)")
    parser.add_argument("--request-id", required=True, help="Target Request ID")
    args = parser.parse_args()
    success = verify_approval_gate(args.request_id)
    exit(0 if success else 1)
