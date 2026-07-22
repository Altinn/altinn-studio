import dot from 'dot-object';

import type { FormStoreState } from 'src/features/form/FormContext';
import type { IDataModelReference } from 'src/layout/common.generated';

export function readDataFromState(state: FormStoreState, reference: IDataModelReference | undefined): unknown {
  if (!reference) {
    return undefined;
  }

  return (
    dot.pick(reference.field, state.data.models[reference.dataType]?.debouncedCurrentData) ??
    dot.pick(reference.field, state.data.models[reference.dataType]?.invalidCurrentData)
  );
}
