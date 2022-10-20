/**
 * Simple class to let you work with (and mutate) a data model binding (possibly including array index accessors)
 * It breaks the data binding into DataBindingPart classes.
 */
export class DataBinding {
  public readonly parts: DataBindingPart[];

  public constructor(public readonly binding: string) {
    this.parts = binding
      .split('.')
      .map((part, index) => new DataBindingPart(this, index, part));
  }

  public at(index: number): DataBindingPart | undefined {
    return this.parts[index];
  }

  public toString(): string {
    return this.parts.map((part) => part.toString()).join('.');
  }
}

export class DataBindingPart {
  public readonly base: string;
  public arrayIndex: number | undefined = undefined;

  public constructor(
    public readonly parent: DataBinding,
    public readonly parentIndex: number,
    raw: string,
  ) {
    const arrayIndex = raw.match(/(\[\d+])?$/);
    if (arrayIndex && arrayIndex[1]) {
      this.arrayIndex = parseInt(
        arrayIndex[1].substring(1, arrayIndex[1].length - 1),
      );
      this.base = raw.substring(0, raw.length - arrayIndex[1].length);
    } else {
      this.base = raw;
    }
  }

  public hasArrayIndex(): boolean {
    return this.arrayIndex !== undefined;
  }

  public toString(): string {
    if (this.arrayIndex !== undefined) {
      return `${this.base}[${this.arrayIndex}]`;
    }

    return this.base;
  }
}
