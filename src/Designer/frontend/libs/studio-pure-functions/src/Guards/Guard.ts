export class Guard {
  static againstNull<T>(value: T | null): asserts value is T {
    if (value === null) throw Error('Guarded against null value.');
  }

  static againstNonJsonTypes(filename: string): void {
    if (!filename.toLowerCase().endsWith('.json')) {
      throw Error(`Guarded against non-json filename: ${filename}`);
    }
  }
}
