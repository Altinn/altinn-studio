import dot from 'dot-object';
import { getPatch } from 'fast-array-diff';
import deepEqual from 'fast-deep-equal';

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

function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScalarOrMissing(value: any): value is string | number | boolean | null | undefined {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function compareAny(props: CompareProps<any>) {
  const { prev, next } = props;
  if (isObject(prev) && isObject(next)) {
    return compareObjects(props);
  }
  if (Array.isArray(prev) && Array.isArray(next)) {
    return compareArrays(props);
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
 * This comparison function is used to determine if two values in an array are similar enough to be considered
 * the same. This is used to determine if an item has been removed or added - or if it has been (slightly) changed and
 * the values within it should be compared individually instead.
 */
function isSimilarEnough(left: any, right: any): boolean {
  if (isObject(left) && isObject(right)) {
    const flatLeft = dot.dot(left);
    const flatRight = dot.dot(right);

    // Produce a set of keys in left object, but leave out nested arrays (those should be compared separately).
    const keysLeft = new Set(Object.keys(flatLeft).filter((key) => key.match(/^[^[\]]+$/)));
    const keysRight = new Set(Object.keys(flatRight).filter((key) => key.match(/^[^[\]]+$/)));

    const numRemove = [...keysLeft].filter((key) => !keysRight.has(key)).length;
    const numReplace = [...keysLeft].filter(
      (key) => keysRight.has(key) && !deepEqual(flatLeft[key], flatRight[key]),
    ).length;

    // Object that can be extended without removing anything does not make destructive changes, so we can
    // consider it similar enough.
    if (numRemove > 0) {
      return false;
    }

    // We want to consider an object similar enough if it only replaces a single value, and does not
    // remove anything. As soon as multiple values are replaced in an object, we'll consider it to be
    // different enough to warrant a full comparison (which may lead to removing an item from the array
    // and adding a new one instead).
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (numReplace > 1) {
      return false;
    }

    // Finally, if there are only add operations left, and/or few enough replace and remove operations,
    // objects are considered similar.
    return true;
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
function compareArrays({ prev, next, current, hasCurrent, patch, path }: CompareProps<any[]>) {
  const realPrev = [...prev];
  const realNext = [...next];
  if (hasCurrent && Array.isArray(current)) {
    if (current.length > realPrev.length) {
      // Add the objects we added locally to realPrev + realNext to make sure isSimilarEnough runs on every row, and
      // that we create a patch that will update missing/outdated values in current array items even if we didn't have
      // the array item(s) before.
      const locallyAdded = current.slice(realPrev.length);
      realPrev.push(...locallyAdded);
      realNext.push(...locallyAdded);
    } else if (current.length < realPrev.length) {
      // Run a diff on current and prev to figure out which row(s) we deleted locally after saving. That row should not
      // be considered when producing the patch, as there is no point in trying to update a row that has been deleted.
      for (const origin of [realPrev, realNext]) {
        const preDiff = getPatch(origin, current, isSimilarEnough);
        for (const part of preDiff) {
          const { type, newPos: nextPos, oldPos: prevPos, items } = part;
          if (type === 'add') {
            let nextIndex = nextPos;
            for (const _item of items) {
              origin.splice(nextIndex, 0, {});
              nextIndex++;
            }
          }
          if (type === 'remove') {
            // We'll count down instead of up so that we can remove the items from the end first, and then we won't
            // have to worry about the indices changing.
            let addToIndex = items.length - 1;
            for (const _item of items) {
              const oldIdx = prevPos + addToIndex--;
              origin.splice(oldIdx, 1);
            }
          }
        }
      }
    }
  }

  const diff = getPatch(realPrev, realNext, isSimilarEnough);
  const localPatch: JsonPatch = [];
  const arrayAfterChanges = [...realPrev];
  for (const part of diff) {
    const { type, newPos: nextPos, oldPos: prevPos, items } = part;
    if (type === 'add') {
      let nextIndex = nextPos;
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
      let addToIndex = items.length - 1;
      for (const _item of items) {
        const oldIdx = prevPos + addToIndex--;
        localPatch.push({ op: 'remove', path: pointer([...path, String(oldIdx)]) });
        arrayAfterChanges.splice(oldIdx, 1);
      }
    }
  }

  if (localPatch.length) {
    if (!hasCurrent) {
      // Always add a test first to make sure the original array is still the same as the one we're changing
      patch.push({ op: 'test', path: pointer(path), value: realPrev });
    }
    patch.push(...localPatch);
  }

  // We still have to compare items within the array, as the code above just checks if items within
  // are similar enough, it doesn't check that they're entirely equal.
  const childPatches: JsonPatch = [];
  for (const [index, prevItem] of arrayAfterChanges.entries()) {
    const nextItem = realNext[index];
    const currentItem = Array.isArray(current) ? current[index] : undefined;
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

function compareValues({ prev, next, hasCurrent, current, patch, path }: CompareProps<any>) {
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
      // patch.push({ op: 'add', path: pointer([...path, '-']), value: next[i] });
      for (const item of next || []) {
        patch.push({ op: 'add', path: pointer([...path, '-']), value: item });
      }
      return;
    }
    if (isObject(current) && isObject(next)) {
      return compareObjects({ prev: {}, next, hasCurrent, current, patch, path });
    }
    if (!isScalarOrMissing(current) || !isScalarOrMissing(next)) {
      // TODO: Investigate these cases and possibly log wantings/notices about them
      return;
    }

    // Do not overwrite changes that have been made to the current object since the next object was created
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
