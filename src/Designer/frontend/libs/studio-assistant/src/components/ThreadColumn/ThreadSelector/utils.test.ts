import { describe, expect, it } from 'vitest';
import { findFocusTargetForKey, isNavigationKey } from './utils';
import type { FocusTarget } from './utils';

const threadIds = ['a', 'b', 'c', 'd'];
const threadB: FocusTarget = { threadId: 'b', part: 'thread' };
const deleteB: FocusTarget = { threadId: 'b', part: 'delete' };

describe('findFocusTargetForKey', () => {
  it.each([
    ['ArrowDown', threadB, { threadId: 'c', part: 'thread' }],
    ['ArrowUp', threadB, { threadId: 'a', part: 'thread' }],
    ['Home', threadB, { threadId: 'a', part: 'thread' }],
    ['End', threadB, { threadId: 'd', part: 'thread' }],
    ['ArrowDown', deleteB, { threadId: 'c', part: 'delete' }],
    ['End', deleteB, { threadId: 'd', part: 'delete' }],
    ['ArrowRight', threadB, deleteB],
    ['ArrowLeft', deleteB, threadB],
  ])('moves from %s to the expected button', (key, current, expected) => {
    expect(findFocusTargetForKey(threadIds, current, key, true)).toEqual(expected);
  });

  it('returns undefined at the ends of the list, so the focus does not wrap', () => {
    expect(
      findFocusTargetForKey(threadIds, { threadId: 'd', part: 'thread' }, 'ArrowDown', true),
    ).toBeUndefined();
    expect(
      findFocusTargetForKey(threadIds, { threadId: 'a', part: 'thread' }, 'ArrowUp', true),
    ).toBeUndefined();
  });

  it('returns undefined for the right key on a delete button and the left key on a thread', () => {
    expect(findFocusTargetForKey(threadIds, deleteB, 'ArrowRight', true)).toBeUndefined();
    expect(findFocusTargetForKey(threadIds, threadB, 'ArrowLeft', true)).toBeUndefined();
  });

  it('returns undefined for the right key when the threads cannot be deleted', () => {
    expect(findFocusTargetForKey(threadIds, threadB, 'ArrowRight', false)).toBeUndefined();
  });

  it('returns undefined for other keys', () => {
    expect(findFocusTargetForKey(threadIds, threadB, 'Enter', true)).toBeUndefined();
  });
});

describe('isNavigationKey', () => {
  it('returns true for the arrow keys, Home and End', () => {
    ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].forEach((key) =>
      expect(isNavigationKey(key)).toBe(true),
    );
  });

  it('returns false for other keys', () => {
    expect(isNavigationKey('Tab')).toBe(false);
    expect(isNavigationKey('Enter')).toBe(false);
  });
});
