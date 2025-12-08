export class Guard {
  static AgainstNonJsonTypes(filename: string): void {
    if (!filename.toLowerCase().endsWith('.json')) {
      throw Error(`Guarded against non-json filename: ${filename}`);
    }
  }
}
