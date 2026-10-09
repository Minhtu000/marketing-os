import os
import json
import argparse
from datetime import datetime, timezone
def verify_approval_gate(request_id):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    approval_file = os.path.join(base_dir, "trusted_approvals", f"{request_id}.json")
    print(f"🔍 Checking OOB Approval for Request: {request_id}")
    print(f"📁 Path: {approval_file}")
    # Fail-Closed 1: Tệp không tồn tại
    if not os.path.exists(approval_file):
        print("❌ REJECTED: OOB approval file does not exist.")
        return False
    try:
        with open(approval_file, "r", encoding="utf-8-sig") as f:
            record = json.load(f)
    except Exception as e:
        print(f"❌ REJECTED: Invalid JSON format - {e}")
        return False
    # Fail-Closed 2: Kiểm tra các trường bắt buộc
    required_fields = ["request_id", "proposal_hash", "decision", "expires_at", "key_id", "signature"]
    for field in required_fields:
        if field not in record or not record[field]:
            print(f"❌ REJECTED: Missing required field '{field}'.")
            return False
    # Fail-Closed 3: Request ID Binding
    if record["request_id"] != request_id:
        print("❌ REJECTED: Request ID mismatch.")
        return False
    # Fail-Closed 4: Quyết định từ chối
    if record["decision"] != "APPROVE":
        print(f"❌ REJECTED: Decision is {record['decision']}.")
        return False
    # Fail-Closed 5: Kiểm tra thời hạn (Expiry)
    try:
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            print("❌ REJECTED: Approval has expired.")
            return False
    except Exception as e:
        print(f"❌ REJECTED: Invalid ISO timestamp - {e}")
        return False
    print("====================================================")
    print("✅ VERIFIED: OOB Approval Record is VALID (Fail-Closed Clean)")
    print("====================================================")
    return True
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="V7 Security Gate Verifier")
    parser.add_argument("--request-id", required=True, help="Target Request ID")
    args = parser.parse_args()
    success = verify_approval_gate(args.request_id)
    exit(0 if success else 1)
