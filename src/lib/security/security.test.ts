import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NextRequest } from 'next/server';
import { signToken, verifyToken, verifyAdminSession } from './auth_guard';
import { canonicalizePythonJson, computeProposalHash, createAndSignApproval } from './approval_signer';
import { POST as loginHandler } from '../../app/api/auth/login/route';
import { POST as logoutHandler } from '../../app/api/auth/logout/route';
test('1. Auth Guard - Token Lifecycle & Verification', () => {
  const now = Math.floor(Date.now() / 1000);
  const validPayload = { user_id: 'admin', role: 'SUPER_ADMIN', iat: now, exp: now + 3600 };
  const token = signToken(validPayload);
  const verified = verifyToken(token);
  assert.notStrictEqual(verified, null);
  assert.strictEqual(verified?.user_id, 'admin');
  // Test tampered token
  const parts = token.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}.invalid_signature`;
  assert.strictEqual(verifyToken(tamperedToken), null);
  // Test expired token
  const expiredPayload = { ...validPayload, exp: now - 100 };
  const expiredToken = signToken(expiredPayload);
  assert.strictEqual(verifyToken(expiredToken), null);
  // Test non-admin role
  const userPayload = { ...validPayload, role: 'USER' };
  const userToken = signToken(userPayload);
  assert.strictEqual(verifyToken(userToken), null);
});
test('2. Auth Guard - CSRF Protection in verifyAdminSession', async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = signToken({ user_id: 'admin', role: 'SUPER_ADMIN', iat: now, exp: now + 3600 });
  // Valid CSRF (Matching Host & Origin)
  const validReq = new NextRequest(new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'host': 'localhost:3000',
      'origin': 'http://localhost:3000',
      'cookie': `marketing_os_session=${token}`
    }
  }));
  const validSession = await verifyAdminSession(validReq);
  assert.notStrictEqual(validSession, null);
  // CSRF Attack (Mismatched Origin)
  const csrfReq = new NextRequest(new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'host': 'localhost:3000',
      'origin': 'http://evil-site.com',
      'cookie': `marketing_os_session=${token}`
    }
  }));
  const csrfSession = await verifyAdminSession(csrfReq);
  assert.strictEqual(csrfSession, null);
});
test('3. Approval Signer - Ed25519 & Path Traversal Guard', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-test-'));
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const session = { user_id: 'admin', role: 'SUPER_ADMIN' as const, iat: 1, exp: 9999999999 };
  const proposal = { proposal_id: 'prop_001', action: 'SEO_UPDATE' };
  // Test Path Traversal Guard
  await assert.rejects(
    async () => {
      await createAndSignApproval('../evil_path', proposal, 'APPROVE', session, tempDir, privateKeyPem);
    },
    { message: 'INVALID_REQUEST_ID_PATH_TRAVERSAL' }
  );
  // Test Valid Signature Generation
  const record = await createAndSignApproval('req_1001', proposal, 'APPROVE', session, tempDir, privateKeyPem);
  assert.strictEqual(record.decision, 'APPROVE');
  assert.strictEqual(record.proposal_hash, computeProposalHash(proposal));
  // Verify Ed25519 Signature
  const canonicalSigningStr = `${record.approval_id}|${record.request_id}|${record.proposal_id}|${record.proposal_hash}|${record.decision}|${record.approver_id}|${record.approved_at}|${record.expires_at}|${record.key_id}`;
  const isSigValid = crypto.verify(null, Buffer.from(canonicalSigningStr, 'utf8'), publicKeyPem, Buffer.from(record.signature, 'hex'));
  assert.strictEqual(isSigValid, true);
  fs.rmSync(tempDir, { recursive: true, force: true });
});
test('4. API Auth Routes - Login & Logout Handlers', async () => {
  // Test invalid login (using standard Web API Request)
  const badReq = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrong_password' })
  }) as unknown as NextRequest;
  const badRes = await loginHandler(badReq);
  assert.strictEqual(badRes.status, 401);
  // Test valid login
  const validReq = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'change_this_admin_password_immediately' })
  }) as unknown as NextRequest;
  const validRes = await loginHandler(validReq);
  assert.strictEqual(validRes.status, 200);
  const cookies = validRes.cookies.get('marketing_os_session');
  assert.notStrictEqual(cookies, undefined);
  // Test logout
  const logoutRes = await logoutHandler();
  assert.strictEqual(logoutRes.status, 200);
});
