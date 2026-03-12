import { describe, expect, it } from '@jest/globals';
import { ArrayUtils } from 'nextsrc/libs/pure-functions/ArrayUtils/ArrayUtils';

describe('ArrayUtils.safeReverse', () => {
  it('returns reversed copy of array', () => {
    expect(ArrayUtils.safeReverse([1, 2, 3])).toEqual([3, 2, 1]);
  });

  it('does not mutate original array', () => {
    const original = [1, 2, 3];
    ArrayUtils.safeReverse(original);
    expect(original).toEqual([1, 2, 3]);
  });

  it('returns undefined for undefined input', () => {
    expect(ArrayUtils.safeReverse(undefined)).toBeUndefined();
  });
});

describe('ArrayUtils.removeAtIndex', () => {
  it('removes element at given index', () => {
    expect(ArrayUtils.removeAtIndex(['A', 'B', 'C', 'D'], 1)).toEqual(['A', 'C', 'D']);
  });

  it('removes first element', () => {
    expect(ArrayUtils.removeAtIndex([1, 2, 3], 0)).toEqual([2, 3]);
  });

  it('removes last element', () => {
    expect(ArrayUtils.removeAtIndex([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it('does not mutate original array', () => {
    const original = [1, 2, 3];
    ArrayUtils.removeAtIndex(original, 1);
    expect(original).toEqual([1, 2, 3]);
  });
});
