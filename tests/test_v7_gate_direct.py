import os
import json
import shutil
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from cryptography.hazmat.primitives.asymmetric import ed25519
# Import module gate trực tiếp
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "lib", "security")))
import gate
class TestV7Ed25519Gate(unittest.TestCase):
    def setUp(self):
        # Tạo thư mục môi trường test tạm thời
        self.test_dir = tempfile.mkdtemp()
        self.approvals_dir = os.path.join(self.test_dir, "trusted_approvals")
        self.keys_dir = os.path.join(self.test_dir, "trusted_keys")
        os.makedirs(self.approvals_dir, exist_ok=True)
        os.makedirs(self.keys_dir, exist_ok=True)
        # Trỏ đường dẫn gate sang thư mục test tạm
        self.orig_file = gate.__file__
        gate.__file__ = os.path.join(self.test_dir, "gate.py")
        # Tạo cặp khóa Ed25519 chuẩn
        self.private_key = ed25519.Ed25519PrivateKey.generate()
        self.public_key = self.private_key.public_key()
        # Lưu public key hex
        pub_hex = self.public_key.public_bytes_raw().hex()
        with open(os.path.join(self.keys_dir, "key_v7_test.pub"), "w") as f:
            f.write(pub_hex)
        # Dữ liệu mẫu chuẩn
        self.req_id = "TEST-REQ-001"
        self.prop_hash = "a"*64
        self.decision = "APPROVE"
        self.expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        self.key_id = "key_v7_test"
        signed_payload = f"{self.req_id}:{self.prop_hash}:{self.decision}:{self.expires_at}"
        sig_hex = self.private_key.sign(signed_payload.encode("utf-8")).hex()
        self.valid_record = {
            "request_id": self.req_id,
            "proposal_hash": self.prop_hash,
            "decision": self.decision,
            "expires_at": self.expires_at,
            "key_id": self.key_id,
            "signature": sig_hex
        }
    def tearDown(self):
        shutil.rmtree(self.test_dir)
    def write_record(self, data):
        with open(os.path.join(self.approvals_dir, f"{self.req_id}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f)
    def test_1_file_not_found(self):
        self.assertFalse(gate.verify_approval_gate("NON-EXISTENT"))
    def test_2_missing_field(self):
        bad_data = self.valid_record.copy()
        del bad_data["signature"]
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_3_id_mismatch(self):
        bad_data = self.valid_record.copy()
        bad_data["request_id"] = "OTHER-ID"
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_4_decision_rejected(self):
        bad_data = self.valid_record.copy()
        bad_data["decision"] = "REJECT"
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_5_expired_timestamp(self):
        bad_data = self.valid_record.copy()
        bad_data["expires_at"] = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_6_untrusted_key_id(self):
        bad_data = self.valid_record.copy()
        bad_data["key_id"] = "untrusted_key"
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_7_tampered_signature(self):
        bad_data = self.valid_record.copy()
        # Thay đổi 1 byte trong signature
        sig_bytes = bytearray(bytes.fromhex(bad_data["signature"]))
        sig_bytes[0] ^= 0xFF
        bad_data["signature"] = sig_bytes.hex()
        self.write_record(bad_data)
        self.assertFalse(gate.verify_approval_gate(self.req_id))
    def test_8_valid_ed25519_approval(self):
        self.write_record(self.valid_record)
        self.assertTrue(gate.verify_approval_gate(self.req_id))
if __name__ == "__main__":
    unittest.main()
