import { buildDerivedValidationState } from 'src/features/validation/deriveValidationState';
import type { ExpressionDependency } from 'src/features/expressions/runtime/expressionObserver';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type {
  DerivedValidationState,
  DerivedValidationStateInputs,
} from 'src/features/validation/deriveValidationState';

function appendFields(signature: unknown[], value: object, excludedKey: string) {
  const fields = Object.entries(value).filter(([key]) => key !== excludedKey);
  signature.push(fields.length);
  for (const [key, field] of fields) {
    signature.push(key, field);
  }
}

// Sharing the immutable state projection performs no expression evaluation.
// The derived result and its dependency collection remain private per consumer.
const storeSignatures = new WeakMap<FormStoreState, readonly unknown[]>();

function getStoreSignature(state: FormStoreState): readonly unknown[] {
  const cached = storeSignatures.get(state);
  if (cached) {
    return cached;
  }

  const signature: unknown[] = [];
  // Include all fields except immediate valid data, including future fields.
  appendFields(signature, state, 'data');
  appendFields(signature, state.data, 'models');
  const models = Object.entries(state.data.models);
  signature.push(models.length);
  for (const [dataType, model] of models) {
    signature.push(dataType);
    appendFields(signature, model, 'currentData');
  }
  storeSignatures.set(state, signature);
  return signature;
}

function replayDependencies(runtime: ExpressionDataSources, dependencies: readonly ExpressionDependency[]) {
  runtime.markExpressionEvaluated();
  for (const dependency of dependencies) {
    runtime.track(dependency);
  }
}

/**
 * Keeps one validation snapshot for one consumer. Validation reads debounced
 * data and invalid input, so a valid currentData-only edit cannot affect it.
 * Keeping this cache private also keeps expression dependency collection with
 * the observer that originally evaluated the snapshot.
 */
export function createValidationStateDeriver() {
  let previousSignature: unknown[] | undefined;
  let previousDerived: DerivedValidationState | undefined;
  let hiddenDependencies: readonly ExpressionDependency[] = [];
  let evalDependencies: readonly ExpressionDependency[] = [];

  return (
    state: FormStoreState,
    inputs: DerivedValidationStateInputs,
    contextInputs: readonly unknown[] = [],
  ): DerivedValidationState => {
    const collectHiddenDependencies = inputs.hiddenDataSources.collectDependencies;
    const collectEvalDependencies = inputs.evalDataSources.collectDependencies;
    if (
      !collectHiddenDependencies ||
      !collectEvalDependencies ||
      !inputs.hiddenDataSources.getSnapshotRevision ||
      !inputs.evalDataSources.getSnapshotRevision
    ) {
      // Custom runtimes without a revision or collector cannot safely reuse results.
      return buildDerivedValidationState(state, inputs);
    }

    const includedPageKeys = inputs.includedPageKeys ? [...inputs.includedPageKeys] : undefined;
    const includedNodeIds = inputs.includedNodeIds ? [...inputs.includedNodeIds] : undefined;
    const signature: unknown[] = [...getStoreSignature(state)];
    for (const [key, value] of Object.entries(inputs)) {
      if (key !== 'includedPageKeys' && key !== 'includedNodeIds' && key !== 'descendantScope') {
        signature.push(key, value);
      }
    }
    signature.push('includedPageKeys', includedPageKeys?.length, ...(includedPageKeys ?? []));
    signature.push('includedNodeIds', includedNodeIds?.length, ...(includedNodeIds ?? []));
    const scope = inputs.descendantScope;
    signature.push('descendantScope', scope !== undefined, scope?.nodeId, scope?.includeSelf, scope?.restriction);
    signature.push('contextInputs', contextInputs.length, ...contextInputs);
    signature.push(inputs.hiddenDataSources.getSnapshotRevision?.(), inputs.evalDataSources.getSnapshotRevision?.());

    const cachedSignature = previousSignature;
    if (
      previousDerived &&
      cachedSignature?.length === signature.length &&
      signature.every((value, index) => Object.is(value, cachedSignature[index]))
    ) {
      // A store notification may derive before React starts a new collection.
      // Replay this consumer's own dependencies when rendering reuses that result.
      replayDependencies(inputs.hiddenDataSources, hiddenDependencies);
      replayDependencies(inputs.evalDataSources, evalDependencies);
      return previousDerived;
    }

    const hiddenCollection = collectHiddenDependencies(() =>
      collectEvalDependencies(() =>
        buildDerivedValidationState(state, { ...inputs, includedPageKeys, includedNodeIds }),
      ),
    );
    const derived = hiddenCollection.value.value;
    hiddenDependencies = hiddenCollection.dependencies;
    evalDependencies = hiddenCollection.value.dependencies;
    previousSignature = signature;
    previousDerived = derived;
    return derived;
  };
}
