/**
 * We only implement a subset of the JSON Patch standard, not including the 'copy' and 'move' operations.
 * @see https://jsonpatch.com/
 */

/**
 * Adds a value to an object or inserts it into an array. In the case of an array, the value is inserted before the
 * given index. The - character can be used instead of an index to insert at the end of an array.
 */
export interface JsonPatchAddOp {
  op: 'add';
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

/**
 * Removes a value from an object or array.
 */
export interface JsonPatchRemoveOp {
  op: 'remove';
  path: string;
}

/**
 * Replaces a value. Equivalent to a “remove” followed by an “add”.
 */
export interface JsonPatchReplaceOp {
  op: 'replace';
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

/**
 * Tests that the specified value is set in the document. If the test fails, then the patch as a whole should not apply.
 */
export interface JsonPatchTestOp {
  op: 'test';
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export type JsonPatchOp = JsonPatchAddOp | JsonPatchRemoveOp | JsonPatchReplaceOp | JsonPatchTestOp;
export type JsonPatch = JsonPatchOp[];
