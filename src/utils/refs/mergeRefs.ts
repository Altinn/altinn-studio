import type React from 'react';

export class RefsUtils {
  public static merge<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
    return (element: T | null) => {
      refs.forEach((ref) => {
        RefsUtils.setRef(ref, element);
      });
    };
  }

  private static setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
    if (!ref) {
      return;
    }

    if (RefsUtils.isCallbackRef(ref)) {
      ref(value);
      return;
    }

    if (RefsUtils.isRefObject(ref)) {
      (ref as React.MutableRefObject<T | null>).current = value;
    }
  }

  private static isCallbackRef<T>(ref: React.Ref<T>): ref is React.RefCallback<T> {
    return typeof ref === 'function';
  }

  private static isRefObject<T>(ref: React.Ref<T>): ref is React.RefObject<T> {
    return typeof ref === 'object' && ref !== null && 'current' in ref;
  }
}
