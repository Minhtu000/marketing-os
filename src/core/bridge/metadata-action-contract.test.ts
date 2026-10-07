// Runner-agnostic tests (node:test + node:assert). Run: node --test metadata-action-contract.test.ts
// (Node >= 22.18 strips types natively; otherwise use tsx / adapt the imports to vitest or jest.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  validateMetadataActionInput,
  validateActionInputContract,
  assertActionInputContract,
  ActionInputContractError,
  METADATA_ACTION_TYPE,
} from './metadata-action-contract';

const state = (seoTitle: string) => ({
  seo_title: seoTitle,
  rendered_h1: 'Ban hoc sinh',
  parent_category: { id: '12', name: 'Ban hoc' },
  slug: 'ban-hoc-sinh',
  published: true,
});

const valid = (): Record<string, any> => ({
  url: '/ban-hoc-sinh',
  category_id: '188',
  proposed_title: 'Ban hoc sinh gia re',
  expected_parent_id: '12',
  expected_parent_name: 'Ban hoc',
  expected_before: state('Ban hoc sinh'),
  expected_after: state('Ban hoc sinh gia re'),
  rollback_value: { seo_title: 'Ban hoc sinh' },
});

function codes(input: unknown): string[] {
  const r = validateMetadataActionInput(input);
  assert.equal(r.ok, false, 'expected a violation');
  return r.ok ? [] : r.violations.map((v) => v.code);
}
function paths(input: unknown): string[] {
  const r = validateMetadataActionInput(input);
  return r.ok ? [] : r.violations.map((v) => v.path);
}

const hashOf = (input: unknown) => createHash('sha256').update(JSON.stringify({
  action_id: 'a', action_type: METADATA_ACTION_TYPE, project: 'noithatvuonganh.com', adapter: 'playwright', input,
})).digest('hex');

test('valid metadata input passes and returns the SAME object (hash unaffected)', () => {
  const input = valid();
  const before = hashOf(input);
  const r = validateMetadataActionInput(input);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.input, input);
  assert.equal(hashOf(input), before);
});

test('missing expected_before', () => {
  const i = valid(); delete i.expected_before;
  assert.ok(codes(i).includes('recipe_incomplete'));
  assert.ok(paths(i).includes('input.expected_before'));
});

test('missing expected_after', () => {
  const i = valid(); delete i.expected_after;
  assert.ok(codes(i).includes('recipe_incomplete'));
  assert.ok(paths(i).includes('input.expected_after'));
});

test('missing rollback_value', () => {
  const i = valid(); delete i.rollback_value;
  assert.ok(codes(i).includes('recipe_incomplete'));
  assert.ok(paths(i).includes('input.rollback_value'));
});

test('camelCase proposedTitle is NOT renamed: blocked, input untouched', () => {
  const i = valid(); i.proposedTitle = i.proposed_title; delete i.proposed_title;
  const snapshot = JSON.stringify(i);
  const c = codes(i);
  assert.ok(c.includes('input_invalid'));      // unknown field proposedTitle
  assert.ok(c.includes('recipe_incomplete'));  // proposed_title missing
  assert.equal(JSON.stringify(i), snapshot, 'validator must not mutate input');
});

test('legacy e2e input shape is blocked', () => {
  assert.equal(validateMetadataActionInput({ proposedTitle: 'Bridge E2E Test', url: '/ban-hoc-sinh', project: 'noithatvuonganh.com' }).ok, false);
});

test('rollback does not match expected_before', () => {
const i = valid(); i.rollback_value.seo_title = 'Something else';
  assert.deepEqual(codes(i), ['rollback_mismatch']);
});

test('expected_after changes fields outside title', () => {
  for (const [mut, p] of [
    [(i: any) => { i.expected_after.slug = 'new-slug'; }, 'input.expected_after.slug'],
    [(i: any) => { i.expected_after.published = false; }, 'input.expected_after.published'],
    [(i: any) => { i.expected_after.parent_category = { id: '99', name: 'Other' }; }, 'input.expected_after.parent_category'],
    [(i: any) => { i.expected_after.parent_category.name = 'Renamed'; }, 'input.expected_after.parent_category'],
  ] as const) {
    const i = valid(); mut(i);
    assert.deepEqual(codes(i), ['expected_after_inconsistent']);
    assert.deepEqual(paths(i), [p]);
  }
});

test('expected_after title must equal proposed_title and must differ from current', () => {
const a = valid(); a.expected_after.seo_title = 'Different';
  assert.ok(codes(a).includes('expected_after_inconsistent'));
  const b = valid(); b.proposed_title = 'Ban hoc sinh'; b.expected_after = state('Ban hoc sinh');
  assert.deepEqual(codes(b), ['expected_after_inconsistent']);
});

test('missing category_id (and non-numeric / wrong type)', () => {
  const i = valid(); delete i.category_id;
  assert.deepEqual(codes(i), ['recipe_incomplete']);
  for (const bad of ['abc', '', 188, null, '18 8']) {
    const j = valid(); j.category_id = bad;
    assert.deepEqual(codes(j), ['recipe_incomplete']);
  }
});

test('missing parent-category verification (before and after)', () => {
  const a = valid(); delete a.expected_before.parent_category;
  assert.ok(codes(a).includes('parent_category_unverifiable'));
  const b = valid(); b.expected_before.parent_category = { id: '', name: 'Ban hoc' };
  assert.ok(codes(b).includes('parent_category_unverifiable'));
  const c = valid(); c.expected_after.parent_category = { id: '12' };
  assert.ok(codes(c).includes('parent_category_unverifiable'));
});

test('no autofill: missing state fields are violations, nothing is added', () => {
 for (const f of ['seo_title', 'rendered_h1', 'slug', 'published']) {
    const i = valid(); delete i.expected_before[f];
    assert.ok(codes(i).includes('recipe_incomplete'), f);
    assert.equal(f in i.expected_before, false);
  }
});

test('unknown fields anywhere are rejected', () => {
  const a = valid(); a.surprise = 1;
  const b = valid(); b.expected_before.url = '/ban-hoc-sinh';
  const c = valid(); b.expected_before.category_id = '188'; c.rollback_value.extra = 1;
  const d = valid(); d.expected_after.parent_category.extra = 1;
  for (const i of [a, b, c, d]) assert.ok(codes(i).includes('input_invalid'));
});

test('url / title shape', () => {
  for (const u of ['ban-hoc-sinh', '//evil.com', 'https://evil.com/x', '/a b', '/../x', '', undefined]) {
    const i = valid(); i.url = u as any;
    assert.deepEqual(codes(i), ['recipe_incomplete'], String(u));
  }
  const t = valid(); t.proposed_title = ' padded '; t.expected_after.cms_field_value = ' padded ';
  assert.ok(codes(t).includes('recipe_incomplete'));
  const k = valid(); k.proposed_title = 'x\u0000y'; k.expected_after.cms_field_value = 'x\u0000y';
  assert.ok(codes(k).includes('recipe_incomplete'));
});

test('non-object input', () => {
  for (const x of [null, undefined, 'x', 1, [], true]) assert.deepEqual(codes(x), ['recipe_incomplete']);
});

test('all violations are reported together', () => {
  const i = valid(); delete i.category_id; delete i.rollback_value; i.expected_after.slug = 'x';
  assert.deepEqual(new Set(codes(i)), new Set(['recipe_incomplete', 'expected_after_inconsistent']));
});

test('dispatcher leaves other action types untouched, enforces metadata', () => {
  assert.deepEqual(validateActionInputContract('seo.write.content', { anything: 1 }), { ok: true });
  assert.equal(validateActionInputContract(METADATA_ACTION_TYPE, { bad: 1 }).ok, false);
  assert.equal(validateActionInputContract(METADATA_ACTION_TYPE, valid()).ok, true);
});

// Mirrors how approved-action-writer.ts must call the guard: validate first, write second.
function fakeApprovedWriter(dir: string, actionType: string, input: unknown): string {
  assertActionInputContract(actionType, input); // throws before any fs call
  const file = path.join(dir, 'act-001.json');
  fs.writeFileSync(file, JSON.stringify({ input }), { flag: 'wx' });
  return file;
}

test('invalid metadata input creates NO file in approved/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-'));
  const bad = valid(); delete bad.expected_before;
  assert.throws(() => fakeApprovedWriter(dir, METADATA_ACTION_TYPE, bad), ActionInputContractError);
  assert.deepEqual(fs.readdirSync(dir), []);

  const camel = { proposedTitle: 'x', url: '/ban-hoc-sinh' };
  assert.throws(() => fakeApprovedWriter(dir, METADATA_ACTION_TYPE, camel), ActionInputContractError);
  assert.deepEqual(fs.readdirSync(dir), []);

  fakeApprovedWriter(dir, METADATA_ACTION_TYPE, valid());
  assert.deepEqual(fs.readdirSync(dir), ['act-001.json']);
});


