export class Guard {
  static againstNull<T>(variable: T | null): asserts variable is T {
    if (variable === null) throw Error('Variable must not be null.');
  }

  static againstNonJsonTypes(filename: string): void {
    if (!filename.toLowerCase().endsWith('.json')) {
      throw Error(`Guarded against non-json filename: ${filename}`);
    }
  }
}
