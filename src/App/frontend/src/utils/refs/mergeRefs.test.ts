import { useRef } from 'react';

import { renderHook } from '@testing-library/react';

import { RefsUtils } from 'src/utils/refs/mergeRefs';

describe('RefsUtils.merge', () => {
  it('should set callback ref', () => {
    const callbackRef = jest.fn();
    const mergedRef = RefsUtils.merge(callbackRef);
    const element = document.createElement('div');

    mergedRef(element);

    expect(callbackRef).toHaveBeenCalledWith(element);
    expect(callbackRef).toHaveBeenCalledTimes(1);
  });

  it('should set RefObject ref', () => {
    const { result } = renderHook(() => useRef<HTMLDivElement>(null));
    const refObject = result.current;
    const mergedRef = RefsUtils.merge(refObject);
    const element = document.createElement('div');

    mergedRef(element);

    expect(refObject.current).toBe(element);
  });

  it('should set multiple refs', () => {
    const callbackRef1 = jest.fn();
    const callbackRef2 = jest.fn();
    const { result: result1 } = renderHook(() => useRef<HTMLDivElement>(null));
    const { result: result2 } = renderHook(() => useRef<HTMLDivElement>(null));
    const refObject1 = result1.current;
    const refObject2 = result2.current;

    const mergedRef = RefsUtils.merge(callbackRef1, refObject1, callbackRef2, refObject2);
    const element = document.createElement('div');

    mergedRef(element);

    expect(callbackRef1).toHaveBeenCalledWith(element);
    expect(callbackRef2).toHaveBeenCalledWith(element);
    expect(refObject1.current).toBe(element);
    expect(refObject2.current).toBe(element);
  });

  it('should handle undefined refs', () => {
    const callbackRef = jest.fn();
    const mergedRef = RefsUtils.merge(undefined, callbackRef, undefined);
    const element = document.createElement('div');

    mergedRef(element);

    expect(callbackRef).toHaveBeenCalledWith(element);
    expect(callbackRef).toHaveBeenCalledTimes(1);
  });

  it('should handle null element', () => {
    const callbackRef = jest.fn();
    const { result } = renderHook(() => useRef<HTMLDivElement>(null));
    const refObject = result.current;
    const mergedRef = RefsUtils.merge(callbackRef, refObject);

    mergedRef(null);

    expect(callbackRef).toHaveBeenCalledWith(null);
    expect(refObject.current).toBe(null);
  });

  it('should handle empty refs array', () => {
    const mergedRef = RefsUtils.merge();
    const element = document.createElement('div');

    // Should not throw
    expect(() => mergedRef(element)).not.toThrow();
  });

  it('should update RefObject when element changes', () => {
    const { result } = renderHook(() => useRef<HTMLDivElement>(null));
    const refObject = result.current;
    const mergedRef = RefsUtils.merge(refObject);
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    mergedRef(element1);
    expect(refObject.current).toBe(element1);

    mergedRef(element2);
    expect(refObject.current).toBe(element2);
  });

  it('should call callback ref multiple times when element changes', () => {
    const callbackRef = jest.fn();
    const mergedRef = RefsUtils.merge(callbackRef);
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    mergedRef(element1);
    expect(callbackRef).toHaveBeenCalledWith(element1);

    mergedRef(element2);
    expect(callbackRef).toHaveBeenCalledWith(element2);
    expect(callbackRef).toHaveBeenCalledTimes(2);
  });
});
