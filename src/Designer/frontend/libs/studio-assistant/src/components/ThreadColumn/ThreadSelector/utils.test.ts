import { describe, expect, it } from 'vitest';
import { findThreadIdForKey, orderThreadIdsByDistance } from './utils';

const threadIds = ['a', 'b', 'c', 'd'];

describe('findThreadIdForKey', () => {
  it.each([
    ['ArrowDown', 'b', 'c'],
    ['ArrowUp', 'b', 'a'],
    ['Home', 'c', 'a'],
    ['End', 'b', 'd'],
  ])('returns the target of %s from %s', (key, currentThreadId, expectedThreadId) => {
    expect(findThreadIdForKey(threadIds, currentThreadId, key)).toBe(expectedThreadId);
  });

  it('returns undefined at the ends of the list, so the focus does not wrap', () => {
    expect(findThreadIdForKey(threadIds, 'd', 'ArrowDown')).toBeUndefined();
    expect(findThreadIdForKey(threadIds, 'a', 'ArrowUp')).toBeUndefined();
  });

  it('returns undefined for other keys', () => {
    expect(findThreadIdForKey(threadIds, 'b', 'Enter')).toBeUndefined();
  });
});

describe('orderThreadIdsByDistance', () => {
  it('returns the threads after the deleted thread, and then the threads before it, nearest first', () => {
    expect(orderThreadIdsByDistance(threadIds, 'b')).toEqual(['c', 'd', 'a']);
  });

  it('returns the threads before the last thread, nearest first', () => {
    expect(orderThreadIdsByDistance(threadIds, 'd')).toEqual(['c', 'b', 'a']);
  });

  it('returns no threads when the deleted thread was the only one', () => {
    expect(orderThreadIdsByDistance(['a'], 'a')).toEqual([]);
  });
});
