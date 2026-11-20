import type { MutableRefObject, Ref, RefCallback, RefObject } from 'react';

export class RefsUtils {
  public static merge<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
    return (element: T | null) => {
      refs.forEach((ref) => {
        RefsUtils.setRef(ref, element);
      });
    };
  }

  private static setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
    if (!ref) {
      return;
    }

    if (RefsUtils.isCallbackRef(ref)) {
      ref(value);
      return;
    }

    if (RefsUtils.isRefObject(ref)) {
      (ref as MutableRefObject<T | null>).current = value;
    }
  }

  private static isCallbackRef<T>(ref: Ref<T>): ref is RefCallback<T> {
    return typeof ref === 'function';
  }

  private static isRefObject<T>(ref: Ref<T>): ref is RefObject<T> {
    return typeof ref === 'object' && ref !== null && 'current' in ref;
  }
}
