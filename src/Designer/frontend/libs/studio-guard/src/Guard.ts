export class Guard {
  static againstUndefined<T>(value: T | undefined): asserts value is T {
    if (value === undefined) {
      throw new Error('Guarded against undefined value.');
    }
  }

  static againstNull<T>(value: T | null): asserts value is T {
    if (value === null) {
      throw new Error('Guarded against null value.');
    }
  }

  static againstMissingProperty<T extends object, K extends keyof T>(
    obj: T,
    property: K,
  ): asserts obj is T & { [P in K]-?: T[P] } {
    if (!(property in obj)) {
      throw new Error(`Property ${String(property)} is missing.`);
    }
  }

  static againstEmptyArray<T>(arr: T[]): asserts arr is [T, ...T[]] {
    if (arr.length === 0) {
      throw new Error('Guarded against empty array.');
    }
  }

  static againstInvalidValue<T, InvalidValue extends T>(
    value: T,
    invalidValue: InvalidValue,
  ): asserts value is Exclude<T, InvalidValue> {
    if (value === invalidValue) {
      throw new Error(`Guarded against invalid value ${invalidValue}.`);
    }
  }

  static againstNonJsonTypes(filename: string): void {
    if (!filename.toLowerCase().endsWith('.json')) {
      throw Error(`Guarded against non-json filename: ${filename}`);
    }
  }
}
