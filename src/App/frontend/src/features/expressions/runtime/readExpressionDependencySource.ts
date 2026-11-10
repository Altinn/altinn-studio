import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import type {
  ExpressionDependency,
  ExpressionDependencySource,
} from 'src/features/expressions/runtime/expressionObserver';
import type { FormStoreState } from 'src/features/form/FormContext';

/** Immutable source identities for the values observed by the expression runtime. */
export function readExpressionDependencySource(
  store: StoreApi<FormStoreState> | typeof ContextNotProvided,
  dependency: ExpressionDependency,
): ExpressionDependencySource | undefined {
  if (store === ContextNotProvided) {
    return { owner: store, snapshot: undefined };
  }
  const state = store.getState();
  switch (dependency.type) {
    case 'formData':
      return { owner: store, snapshot: state.data.models[dependency.reference.dataType]?.debouncedCurrentData };
    case 'layout':
      return { owner: store, snapshot: state.bootstrap.layoutLookups };
    case 'options':
      return { owner: store, snapshot: state.bootstrap.staticOptions[dependency.optionsId]?.options };
    default:
      return undefined;
  }
}
