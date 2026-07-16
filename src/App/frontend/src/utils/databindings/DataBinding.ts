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

  const ourBinding = new DataBinding(currentLocation);
  const theirBinding = new DataBinding(subject);
  const lastIdx = ourBinding.parts.length - 1;

  for (const ours of ourBinding.parts) {
    const theirs = theirBinding.at(ours.parentIndex);

    if (ours.base !== theirs?.base) {
      break;
    }

    const arrayIndex = ours.parentIndex === lastIdx && currentLocationIsRepGroup ? rowIndex : ours.arrayIndex;

    if (arrayIndex === undefined) {
      continue;
    }

    if (theirs.hasArrayIndex()) {
      // Stop early. We cannot add our row index here, because it makes no sense when an earlier group
      // index changed.we cannot possibly
      break;
    }

    theirs.arrayIndex = arrayIndex;
  }

  return theirBinding.export();
}
