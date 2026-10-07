// Input contract for `seo.write.metadata` (envelope v2, i-web metadata-title recipe v2).
//
// Source of truth: the marketing-os-bridge envelope v2 / runner recipe v2 specification.
// The v1 documents (seo-write-metadata-envelope-v1.md, iweb-seo-metadata-runner-recipe-v1.md)
// are superseded by this contract.
//
// Field semantics (v2) — the names are NOT interchangeable:
//   seo_title   = CMS field `title`   = public HTML <title>.   This is the field being written.
//   rendered_h1 = CMS field `ten_vi`  = public page H1.        Read-only: it must NOT change.
//   The v1 names `rendered_title` and `cms_field_value` are removed. They are not aliased,
//   renamed or tolerated: any v1 field is rejected as an unknown field.
//
// v2 input shape:
//   {
//     url, category_id, proposed_title,
//     expected_parent_id, expected_parent_name,
//     expected_before: { seo_title, rendered_h1, parent_category: { id, name }, slug, published },
//     expected_after:  { seo_title, rendered_h1, parent_category: { id, name }, slug, published },
//     rollback_value:  { seo_title }
//   }
//
// Rules:
//   - Fail-closed. Anything that does not match the schema is a violation.
//   - NO canonicalization: no camelCase -> snake_case, no defaults, no trimming,
//     no filling of missing fields, no copying. On success the SAME input object
//     is returned, so the payload hash (SHA-256 of JSON.stringify({ action_id,
//     action_type, project, adapter, input })) is unaffected.
//   - Pure: no I/O, no imports from the rest of the repo.
//
// Runner-side twin: runner/runner-guard.mjs `validateSeoMetadataInput` (same rules, same codes).
// NOTE: that twin is a separate file and must be migrated to v2 separately.

export const METADATA_ACTION_TYPE = 'seo.write.metadata';

export type MetadataViolationCode =
  | 'recipe_incomplete'
  | 'input_invalid'
  | 'parent_category_unverifiable'
  | 'expected_after_inconsistent'
  | 'rollback_mismatch';

export interface MetadataContractViolation {
  code: MetadataViolationCode;
  path: string;
  message: string;
}

export interface MetadataParentCategory {
  id: string;
  name: string;
}

export interface MetadataState {
  /** CMS field `title` = public HTML <title>. May be an empty string in expected_before. */
  seo_title: string;
  /** CMS field `ten_vi` = public H1. Non-empty, and must be preserved by the action. */
  rendered_h1: string;
  parent_category: MetadataParentCategory;
  slug: string;
  published: boolean;
}

export interface MetadataActionInputV2 {
  url: string;
  category_id: string;
  proposed_title: string;
  expected_parent_id: string;
  expected_parent_name: string;
  expected_before: MetadataState;
  expected_after: MetadataState;
  rollback_value: { seo_title: string };
}

export type MetadataContractResult =
  | { ok: true; input: MetadataActionInputV2 }
  | { ok: false; violations: MetadataContractViolation[] };

export type ActionInputContractResult =
  | { ok: true }
  | { ok: false; violations: MetadataContractViolation[] };

const INPUT_KEYS = [
  'url', 'category_id', 'proposed_title', 'expected_parent_id', 'expected_parent_name',
  'expected_before', 'expected_after', 'rollback_value',
];
const STATE_KEYS = ['seo_title', 'rendered_h1', 'parent_category', 'slug', 'published'];
const PARENT_KEYS = ['id', 'name'];
const ROLLBACK_KEYS = ['seo_title'];
const POSITIVE_INT = /^[1-9]\d*$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type Add = (code: MetadataViolationCode, path: string, message: string) => void;

function checkUnknownKeys(obj: Record<string, unknown>, allowed: string[], path: string, add: Add): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) add('input_invalid', `${path}.${k}`, `unknown field "${k}" (no renaming or canonicalization is performed)`);
  }
}

// Returns true only if the state is structurally valid and added no violation.
function checkState(path: string, s: unknown, add: Add): boolean {
  if (!isObj(s)) {
    add('recipe_incomplete', path, `${path} is missing or not an object`);
    return false;
  }
  let ok = true;
  const fail: Add = (c, p, m) => { ok = false; add(c, p, m); };

  checkUnknownKeys(s, STATE_KEYS, path, fail);
  if (typeof s.seo_title !== 'string') fail('recipe_incomplete', `${path}.seo_title`, 'seo_title (CMS `title` = HTML <title>) must be a string (empty is allowed)');
  if (!isStr(s.rendered_h1)) fail('recipe_incomplete', `${path}.rendered_h1`, 'rendered_h1 (CMS `ten_vi` = public H1) must be a non-empty string');
  if (!isStr(s.slug)) fail('recipe_incomplete', `${path}.slug`, 'slug must be a non-empty string');
  if (typeof s.published !== 'boolean') fail('recipe_incomplete', `${path}.published`, 'published must be a boolean');

  const p = s.parent_category;
  if (!isObj(p)) {
    fail('parent_category_unverifiable', `${path}.parent_category`, 'parent_category {id, name} is required to verify id_list');
  } else {
    checkUnknownKeys(p, PARENT_KEYS, `${path}.parent_category`, fail);
    if (!isStr(p.id)) fail('parent_category_unverifiable', `${path}.parent_category.id`, 'parent_category.id must be a non-empty string');
    if (!isStr(p.name)) fail('parent_category_unverifiable', `${path}.parent_category.name`, 'parent_category.name must be a non-empty string');
  }
  return ok;
}

export function validateMetadataActionInput(input: unknown): MetadataContractResult {
  const violations: MetadataContractViolation[] = [];
  const add: Add = (code, path, message) => { violations.push({ code, path, message }); };

  if (!isObj(input)) {
    return { ok: false, violations: [{ code: 'recipe_incomplete', path: 'input', message: 'input must be an object' }] };
  }

  checkUnknownKeys(input, INPUT_KEYS, 'input', add);

  const url = input.url;
  if (!isStr(url) || !url.startsWith('/') || url.startsWith('//') || /\s|\.\.|:/.test(url)) {
    add('recipe_incomplete', 'input.url', 'url must be a site-relative path starting with a single "/"');
  }
  if (!isStr(input.category_id) || !/^\d+$/.test(input.category_id)) {
    add('recipe_incomplete', 'input.category_id', 'category_id must be a numeric string');
  }
  const title = input.proposed_title;
  if (!isStr(title) || title !== title.trim() || CONTROL_CHARS.test(title)) {
    add('recipe_incomplete', 'input.proposed_title', 'proposed_title must be a non-empty string without control characters or surrounding whitespace');
  }

  const parentId = input.expected_parent_id;
  let parentIdOk = false;
  if (typeof parentId !== 'string' || !POSITIVE_INT.test(parentId)) {
    add('parent_category_unverifiable', 'input.expected_parent_id', 'expected_parent_id must be a positive integer string (^[1-9]\\d*$)');
  } else {
    parentIdOk = true;
  }
  const parentName = input.expected_parent_name;
  let parentNameOk = false;
  if (!isStr(parentName)) {
    add('parent_category_unverifiable', 'input.expected_parent_name', 'expected_parent_name must be a non-empty string');
  } else {
    parentNameOk = true;
  }

  const beforeOk = checkState('input.expected_before', input.expected_before, add);
  const afterOk = checkState('input.expected_after', input.expected_after, add);

  const rb = input.rollback_value;
  let rollbackOk = false;
  if (!isObj(rb)) {
    add('recipe_incomplete', 'input.rollback_value', 'rollback_value is missing or not an object');
  } else {
    checkUnknownKeys(rb, ROLLBACK_KEYS, 'input.rollback_value', add);
    if (typeof rb.seo_title !== 'string') add('recipe_incomplete', 'input.rollback_value.seo_title', 'rollback_value.seo_title must be a string (empty is allowed)');
    else rollbackOk = true;
  }

  // Cross-field rules — only evaluated on structurally valid parts.
  if (beforeOk) {
    const b = input.expected_before as unknown as MetadataState;

    if (parentIdOk && parentId !== b.parent_category.id) {
      add('parent_category_unverifiable', 'input.expected_parent_id', 'expected_parent_id must exactly equal expected_before.parent_category.id');
    }
    if (parentNameOk && parentName !== b.parent_category.name) {
      add('parent_category_unverifiable', 'input.expected_parent_name', 'expected_parent_name must exactly equal expected_before.parent_category.name');
    }
    if (rollbackOk && (rb as { seo_title: string }).seo_title !== b.seo_title) {
      add('rollback_mismatch', 'input.rollback_value.seo_title', 'rollback value must equal expected_before.seo_title');
    }
    if (typeof title === 'string' && title === b.seo_title) {
      add('expected_after_inconsistent', 'input.proposed_title', 'proposed_title equals current seo_title (no-op)');
    }

    if (afterOk) {
      const a = input.expected_after as unknown as MetadataState;
      if (typeof title === 'string' && a.seo_title !== title) {
        add('expected_after_inconsistent', 'input.expected_after.seo_title', 'must equal proposed_title');
      }
      if (a.rendered_h1 !== b.rendered_h1) add('expected_after_inconsistent', 'input.expected_after.rendered_h1', 'rendered_h1 (H1) must be preserved');
      if (a.slug !== b.slug) add('expected_after_inconsistent', 'input.expected_after.slug', 'slug must be preserved');
      if (a.published !== b.published) add('expected_after_inconsistent', 'input.expected_after.published', 'published state must be preserved');
      if (a.parent_category.id !== b.parent_category.id || a.parent_category.name !== b.parent_category.name) {
        add('expected_after_inconsistent', 'input.expected_after.parent_category', 'parent category must be preserved');
      }
    }
  }

  if (violations.length > 0) return { ok: false, violations };
  return { ok: true, input: input as unknown as MetadataActionInputV2 };
}

// Dispatcher. Action types without a contract here are left untouched (existing behaviour).
export function validateActionInputContract(actionType: string, input: unknown): ActionInputContractResult {
  if (actionType === METADATA_ACTION_TYPE) return validateMetadataActionInput(input);
  return { ok: true };
}

export class ActionInputContractError extends Error {
  violations: MetadataContractViolation[];
  constructor(actionType: string, violations: MetadataContractViolation[]) {
    super(`${actionType} input violates contract: ${violations.map((v) => `${v.code}@${v.path}`).join(', ')}`);
    this.name = 'ActionInputContractError';
    this.violations = violations;
  }
}

// Call this BEFORE any filesystem call that creates an approved envelope.
export function assertActionInputContract(actionType: string, input: unknown): void {
  const r = validateActionInputContract(actionType, input);
  if (!r.ok) throw new ActionInputContractError(actionType, r.violations);
}
