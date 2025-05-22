import { getPatch } from 'fast-array-diff';
import deepEqual from 'fast-deep-equal';

import { ALTINN_ROW_ID } from 'src/features/formData/types';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';

interface Props<T> {
  prev: T; // The old/original object
  next: T; // The new object, which contains changes to the original

  // The current object, which may have been changed since the new object was created. Supply this to
  // ensure that the patch can be applied to the current object without overwriting any changes that may
  // have been made to it since it started diverging from the original object.
  // Please note: When a current object is supplied, the patch will be created WITHOUT test operations, as
  // we already know what to expect from the object the patch is being applied to.
  current?: T;
}

interface CompareProps<T> extends Props<T> {
  hasCurrent: boolean;
  patch: JsonPatch;
  path: string[];
}

/**
 * This will create a JSON patch that can be used to update the previous object to the next object.
 * It will look for the most shallow changes possible, and will always add a 'test' operation before
 * changes that can be tested for. This should in theory also make the patch reversible, and will ensure
 * that the patch can be applied to the previous object without overwriting any changes that may have
 * been made to the previous object since the next object was created.
 */
export function createPatch({ prev, next, current }: Props<object>): JsonPatch {
  const patch: JsonPatch = [];
  if (!isObject(prev)) {
    throw new Error('prev must be an object');
  }
  if (!isObject(next)) {
    throw new Error('next must be an object');
  }

  const hasCurrent = isObject(current);
  compareObjects({ prev, next, current, hasCurrent, patch, path: [] });
  return patch;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareAny(props: CompareProps<unknown>) {
  const { prev, next } = props;
  if (isObject(prev) && isObject(next)) {
    return compareObjects(props as CompareProps<object>);
  }
  if (Array.isArray(prev) && Array.isArray(next)) {
    return compareArrays(props as CompareProps<unknown[]>);
  }
  compareValues(props);
}

function compareObjects({ prev, next, current, path, ...rest }: CompareProps<object>) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const prevValue = prev[key];
    const nextValue = next[key];
    const currentValue = isObject(current) ? current[key] : undefined;
    compareAny({ prev: prevValue, next: nextValue, current: currentValue, path: [...path, key], ...rest });
  }
}

/**
 * This comparison function is used to determine if two values in an array can be considered the same. This is used to
 * determine if an item (i.e. a row in a repeating group) has been removed or added.
 */
function isSameRow(left: unknown, right: unknown): boolean {
  if (isObject(left) && isObject(right)) {
    if (!(ALTINN_ROW_ID in left && ALTINN_ROW_ID in right)) {
      window.logWarn(
        `Unable to compare objects in array, as one or both are missing ` +
          `the ${ALTINN_ROW_ID} property. You may experience duplicated or missing rows in the form.`,
      );
      return false;
    }

    return left[ALTINN_ROW_ID] === right[ALTINN_ROW_ID];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return deepEqual(left, right);
  }

  return left === right;
}

/**
 * When comparing arrays, some items may have been removed, some added, and some changed. In order to figure ou
 * which operation to choose, we need to do something a bit more complex than the code in this file. This uses
 * an LCS algorithm to figure out the longest common subsequence between the two arrays, and then uses that to
 * produce the JsonPatch to create. Do not be fooled by the format returned from getPatch, it is not a JsonPatch
 * even if it looks like it at a glance.
 */
function compareArrays({ prev, next, current, hasCurrent, patch, path }: CompareProps<unknown[]>) {
  const diff = getPatch(prev, next, isSameRow).sort((a, b) => {
    // Always sort 'add' operations last, and then order 'remove' to keep 'oldPos' descending
    if (a.type === 'add') {
      return 1;
    }
    if (b.type === 'add') {
      return -1;
    }
    return b.oldPos - a.oldPos;
  });

  const allValues = [...next, ...prev, ...(current || [])];
  const allValuesAreStrings = allValues.length > 0 && allValues.every((item) => typeof item === 'string');
  if (allValuesAreStrings) {
    if (next.length > 0) {
      if (current && !deepEqual(current, prev)) {
        // Special case. If we have a current model, and that model is an array of strings that is different from
        // next, we'll keep the current value. This can happen if you for example have a file uploader that saves
        // IDs to a list in the data model. When one attachment got uploaded, and got saved to the backend, we started
        // uploading a new attachment (which got added to the current model), but before the previous save response
        // came back from the backend.
        return;
      } else if (!current && deepEqual(prev, next)) {
        // No need to make any changes, the current model is already the same as the target model.
        return;
      } else if (!current) {
        patch.push({
          op: 'test',
          path: pointer(path),
          value: prev,
        });
      }
      patch.push({
        op: 'replace',
        path: pointer(path),
        value: next,
      });
    } else {
      if (current && !deepEqual(current, prev)) {
        // Same special case as above, but for when the next array is empty (i.e. the backend hasn't seen any values in
        // this array yet, but while saving the user has added some values to the current model, for example by
        // uploading an attachment which adds a UUID reference).
        return;
      } else if (!current && prev.length === 0) {
        // No need to make any changes, the current model is already the same as the target model.
        return;
      } else {
        patch.push({
          op: 'remove',
          path: pointer(path),
        });
      }
    }
    return;
  }

  const localPatch: JsonPatch = [];
  const arrayAfterChanges = [...prev];
  for (const part of diff) {
    const { type, newPos, oldPos, items } = part;
    if (type === 'add') {
      let nextIndex = newPos;
      for (const item of items) {
        const isAppend = nextIndex === arrayAfterChanges.length;
        localPatch.push({ op: 'add', path: pointer([...path, isAppend ? '-' : String(nextIndex)]), value: item });
        if (isAppend) {
          arrayAfterChanges.push(item);
        } else {
          arrayAfterChanges.splice(nextIndex, 0, item);
        }
        nextIndex++;
      }
    } else if (type === 'remove') {
      // We'll count down instead of up so that we can remove the items from the end first, and then we won't have to
      // worry about the indices changing.
      for (const _item of items) {
        localPatch.push({ op: 'remove', path: pointer([...path, String(oldPos)]) });
        arrayAfterChanges.splice(oldPos, 1);
      }
    }
  }

  if (localPatch.length) {
    if (!hasCurrent) {
      // Always add a test first to make sure the original array is still the same as the one we're changing
      patch.push({ op: 'test', path: pointer(path), value: prev });
    }
    patch.push(...localPatch);
  }

  // We still have to compare items within the array, as the code above just checks if items within
  // are similar enough, it doesn't check that they're entirely equal.
  const childPatches: JsonPatch = [];
  for (const [index, prevItem] of arrayAfterChanges.entries()) {
    const nextItem = next[index];
    const currentItem = Array.isArray(current) ? current[index] : undefined;
    if (hasCurrent && currentItem === undefined) {
      // The array item that the backend made changes to have been deleted from the frontend, so we don't need to
      // compare it to the current model. A later PATCH from app-frontend will delete the row.
      continue;
    }

    compareAny({
      prev: prevItem,
      next: nextItem,
      hasCurrent,
      current: currentItem,
      patch: childPatches,
      path: [...path, String(index)],
    });
  }
  patch.push(...childPatches);
}

function compareValues({ prev, next, hasCurrent, current, patch, path }: CompareProps<unknown>) {
  if (prev === next) {
    return;
  }
  if (hasCurrent && !deepEqual(current, prev)) {
    if (current === undefined && next !== undefined) {
      patch.push({ op: 'add', path: pointer(path), value: next });
      return;
    }
    if (deepEqual(current, next)) {
      // Definitely no need to make any changes here, the current model has the target value already.
      return;
    }
    if (Array.isArray(current) && Array.isArray(next)) {
      // Add all the array items form the next (backend) array that are missing from the current (frontend) array
      for (const item of next || []) {
        patch.push({ op: 'add', path: pointer([...path, '-']), value: item });
      }
      return;
    }
    if (isObject(current) && isObject(next)) {
      return compareObjects({ prev: {}, next, hasCurrent, current, patch, path });
    }

    // Do not overwrite changes that have been made to the current object since the next object was created.
    // This way we'll possibly overwrite changes made by other users (or the backend), but we'll do that in
    // the next request. most times this will happen is when the user has been editing the form after the
    // save request started (and before the response was returned), and as long as the ProcessDataWrite code
    // on the backend that potentially makes changes to the code is idempotent, this should be fine.
    return;
  }

  if (next === undefined) {
    current === undefined && patch.push({ op: 'test', path: pointer(path), value: prev });
    patch.push({ op: 'remove', path: pointer(path) });
  } else if (prev === undefined) {
    patch.push({ op: 'add', path: pointer(path), value: next });
  } else {
    current === undefined && patch.push({ op: 'test', path: pointer(path), value: prev });
    patch.push({ op: 'replace', path: pointer(path), value: next });
  }
}

function pointer(path: string[]) {
  return `/${path.join('/')}`;
}
