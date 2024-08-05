import { jest } from '@jest/globals';

import { invalidateCache, memoize } from 'src/utils/memoize';

function add(a: number, b: number) {
  return a + b;
}

describe('memoize', () => {
  afterEach(() => {
    invalidateCache();
  });
  it('should return the correct result', () => {
    const memoizedAdd = memoize(add);
    expect(memoizedAdd(1, 2)).toEqual(3);
  });

  it('should only call the function once for the same arguments', () => {
    const spy = jest.fn(add);
    const memoizedAdd = memoize(spy);
    memoizedAdd(1, 2);
    memoizedAdd(1, 2);
    memoizedAdd(1, 2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should call the function again if the arguments change', () => {
    const spy = jest.fn(add);
    const memoizedAdd = memoize(spy);
    memoizedAdd(1, 2);
    memoizedAdd(1, 2);
    memoizedAdd(1, 2);
    expect(spy).toHaveBeenCalledTimes(1);

    memoizedAdd(1, 3);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should return the correct results when the arguments change', () => {
    const spy = jest.fn(add);
    const memoizedAdd = memoize(spy);
    memoizedAdd(1, 2);
    memoizedAdd(1, 2);

    expect(memoizedAdd(1, 2)).toEqual(3);
    expect(spy).toHaveBeenCalledTimes(1);

    expect(memoizedAdd(1, 3)).toEqual(4);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
