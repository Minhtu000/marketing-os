import os
import json
import time
import hashlib
import argparse
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
def canonicalize_json(data):
    return json.dumps(data, separators=(',', ':'), sort_keys=True, ensure_ascii=False)
def check_and_mark_replay_atomic(state_dir, request_id):
    os.makedirs(state_dir, exist_ok=True)
    lock_file = os.path.join(state_dir, "executed_requests.lock")
    registry_file = os.path.join(state_dir, "executed_requests.json")
    timeout = 3.0
    start_time = time.time()
    lock_fd = None
    while True:
        try:
            lock_fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            break
        except FileExistsError:
            if time.time() - start_time > timeout:
                print("[REJECT] Replay registry lock acquisition timed out.", flush=True)
                return False
            time.sleep(0.01)
    try:
        executed_list = []
        if os.path.exists(registry_file):
            try:
                with open(registry_file, "r", encoding="utf-8") as f:
                    executed_list = json.load(f)
            except Exception:
                executed_list = []
        if request_id in executed_list:
            return False
        executed_list.append(request_id)
        temp_file = registry_file + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(executed_list, f, indent=2)
        os.replace(temp_file, registry_file)
        return True
    finally:
        if lock_fd is not None:
            os.close(lock_fd)
            try:
                os.remove(lock_file)
            except OSError:
                pass
def verify_approval_gate(request_id):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    approvals_dir = os.environ.get("V7_APPROVALS_DIR", os.path.join(base_dir, "trusted_approvals"))
    keys_dir = os.environ.get("V7_TRUSTED_KEYS_DIR", os.path.join(base_dir, "trusted_keys"))
    proposals_dir = os.environ.get("V7_PROPOSALS_DIR", os.path.join(root_dir, "data", "proposals"))
    state_dir = os.environ.get("V7_STATE_DIR", os.path.join(root_dir, "data", "state"))
    approval_file = os.path.join(approvals_dir, f"{request_id}.json")
    proposal_file = os.path.join(proposals_dir, f"{request_id}.json")
    print(f"[GATE] Checking OOB Approval for Request: {request_id}", flush=True)
    if not os.path.exists(approval_file):
        print("[REJECT] OOB approval file does not exist.", flush=True)
        return False
    try:
        with open(approval_file, "r", encoding="utf-8-sig") as f:
            record = json.load(f)
    except Exception as e:
        print(f"[REJECT] Invalid approval JSON format - {e}", flush=True)
        return False
    required_fields = ["request_id", "proposal_hash", "decision", "expires_at", "key_id", "signature"]
    for field in required_fields:
        if field not in record or not record[field]:
            print(f"[REJECT] Missing required field '{field}'.", flush=True)
            return False
    if record["request_id"] != request_id:
        print("[REJECT] Request ID mismatch.", flush=True)
        return False
    if record["decision"] != "APPROVE":
        print(f"[REJECT] Decision is {record['decision']}.", flush=True)
        return False
    try:
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            print("[REJECT] Approval record has expired.", flush=True)
            return False
    except Exception as e:
        print(f"[REJECT] Invalid ISO timestamp format - {e}", flush=True)
        return False
    key_id = record["key_id"]
    pub_key_path = os.path.join(keys_dir, f"{key_id}.pub")
    if not os.path.exists(pub_key_path):
        print(f"[REJECT] Public key '{key_id}' is not trusted (file not found in trust store).", flush=True)
        return False
    if os.path.exists(proposal_file):
        try:
            with open(proposal_file, "r", encoding="utf-8-sig") as f:
                proposal_data = json.load(f)
            computed_hash = hashlib.sha256(canonicalize_json(proposal_data).encode("utf-8")).hexdigest()
            if computed_hash != record["proposal_hash"]:
                print("[REJECT] Proposal hash mismatch.", flush=True)
                return False
        except Exception as e:
            print(f"[REJECT] Error recomputing proposal hash - {e}", flush=True)
            return False
    try:
        with open(pub_key_path, "rb") as kf:
            public_key_bytes = kf.read()
        if b"BEGIN PUBLIC KEY" in public_key_bytes:
            public_key = serialization.load_pem_public_key(public_key_bytes)
        else:
            public_key = ed25519.Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_bytes.decode('utf-8').strip()))
        signed_payload = f"{record['request_id']}:{record['proposal_hash']}:{record['decision']}:{record['expires_at']}"
        signature_bytes = bytes.fromhex(record["signature"])
        public_key.verify(signature_bytes, signed_payload.encode("utf-8"))
    except Exception as e:
        print(f"[REJECT] Ed25519 signature verification failed - {e}", flush=True)
        return False
    if not check_and_mark_replay_atomic(state_dir, request_id):
        print("[REJECT] Request ID has already been executed or replay lock contention.", flush=True)
        return False
    print("====================================================", flush=True)
    print("[OK] VERIFIED: Ed25519 Signature & Proposal Hash VALID (Fail-Closed Passed)", flush=True)
    print("====================================================", flush=True)
    return True
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="V7 Security Gate Verifier (Ed25519 Strict & Atomic Replay)")
    parser.add_argument("--request-id", required=True, help="Target Request ID")
    args = parser.parse_args()
    success = verify_approval_gate(args.request_id)
    exit(0 if success else 1)
