import type { IDataModelReference } from 'src/layout/common.generated';

/**
 * Simple class to let you work with (and mutate) a data model binding (possibly including array index accessors)
 * It breaks the data binding into DataBindingPart classes.
 */
export class DataBinding {
  public readonly parts: DataBindingPart[];

  public constructor(public readonly binding: IDataModelReference) {
    this.parts = binding.field.split('.').map((part, index) => new DataBindingPart(this, index, part));
  }

  public at(index: number): DataBindingPart | undefined {
    return this.parts[index];
  }

  public export(): IDataModelReference {
    return {
      dataType: this.binding.dataType,
      field: this.parts.map((part) => part.toString()).join('.'),
    };
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
      this.arrayIndex = parseInt(arrayIndex[1].substring(1, arrayIndex[1].length - 1));
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

interface TransposeDataBindingParams {
  subject: IDataModelReference;
  currentLocation: IDataModelReference;
  rowIndex?: number;
  currentLocationIsRepGroup?: boolean;
}

export function transposeDataBinding({
  subject,
  currentLocation,
  rowIndex,
  currentLocationIsRepGroup,
}: TransposeDataBindingParams): IDataModelReference {
  if (currentLocation.dataType !== subject.dataType) {
    return subject;
  }

  const currentParts = currentLocation.field.split('.');
  const subjectParts = subject.field.split('.');
  const lastIdx = currentParts.length - 1;

  for (const [index, currentPart] of currentParts.entries()) {
    const subjectPart = subjectParts[index];
    const current = parseBindingPart(currentPart);
    const target = subjectPart === undefined ? undefined : parseBindingPart(subjectPart);

    if (current.base !== target?.base) {
      break;
    }

    const arrayIndex = index === lastIdx && currentLocationIsRepGroup ? rowIndex : current.arrayIndex;

    if (arrayIndex === undefined) {
      continue;
    }

    if (target.arrayIndex !== undefined) {
      // Stop early. We cannot add our row index here, because it makes no sense when an earlier group
      // index changed.we cannot possibly
      break;
    }

    subjectParts[index] = `${target.base}[${arrayIndex}]`;
  }

  return { dataType: subject.dataType, field: subjectParts.join('.') };
}

function parseBindingPart(raw: string): { base: string; arrayIndex: number | undefined } {
  const arrayStart = raw.lastIndexOf('[');
  if (arrayStart === -1 || !raw.endsWith(']')) {
    return { base: raw, arrayIndex: undefined };
  }

  const rawIndex = raw.slice(arrayStart + 1, -1);
  if (!/^\d+$/.test(rawIndex)) {
    return { base: raw, arrayIndex: undefined };
  }

  return { base: raw.slice(0, arrayStart), arrayIndex: Number(rawIndex) };
}
