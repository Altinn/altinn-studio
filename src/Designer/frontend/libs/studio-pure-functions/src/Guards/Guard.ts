export class Guard {
  static againstNonJsonTypes(filename: string): void {
    if (!filename.toLowerCase().endsWith('.json')) {
      throw Error(`Guarded against non-json filename: ${filename}`);
    }
  }
}
