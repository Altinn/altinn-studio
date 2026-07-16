import type { IDataModelReference } from 'src/layout/common.generated';

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
