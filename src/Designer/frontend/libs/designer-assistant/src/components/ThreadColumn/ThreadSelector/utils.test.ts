import { describe, expect, it } from 'vitest';
import { findFocusTargetForKey } from './utils';
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

  it('keeps the current button at the ends of the list, so the focus does not wrap', () => {
    const lastThread: FocusTarget = { threadId: 'd', part: 'thread' };
    const firstThread: FocusTarget = { threadId: 'a', part: 'thread' };
    expect(findFocusTargetForKey(threadIds, lastThread, 'ArrowDown', true)).toEqual(lastThread);
    expect(findFocusTargetForKey(threadIds, firstThread, 'ArrowUp', true)).toEqual(firstThread);
  });

  it('keeps the current button for the right key on a delete button and the left key on a thread', () => {
    expect(findFocusTargetForKey(threadIds, deleteB, 'ArrowRight', true)).toEqual(deleteB);
    expect(findFocusTargetForKey(threadIds, threadB, 'ArrowLeft', true)).toEqual(threadB);
  });

  it('keeps the current button for the right key when the threads cannot be deleted', () => {
    expect(findFocusTargetForKey(threadIds, threadB, 'ArrowRight', false)).toEqual(threadB);
  });

  it('returns undefined for keys that do not navigate', () => {
    expect(findFocusTargetForKey(threadIds, threadB, 'Enter', true)).toBeUndefined();
    expect(findFocusTargetForKey(threadIds, threadB, 'Tab', true)).toBeUndefined();
  });
});
