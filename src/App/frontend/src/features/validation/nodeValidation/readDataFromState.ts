import dot from 'dot-object';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import type { FormStoreState } from 'src/features/form/FormContext';

export function readDataFromState(state: FormStoreState, reference: IDataModelReference | undefined): unknown {
  if (!reference) {
    return undefined;
  }

  return (
    dot.pick(reference.field, state.data.models[reference.dataType]?.debouncedCurrentData) ??
    dot.pick(reference.field, state.data.models[reference.dataType]?.invalidCurrentData)
  );
}
