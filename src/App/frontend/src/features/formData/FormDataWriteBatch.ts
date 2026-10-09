import type { FDNewValue } from 'src/features/formData/FormDataWriteStateMachine';

export type FDBatchedValue = Pick<FDNewValue, 'reference' | 'newValue'>;

/** Collect effect writes until the next microtask. Each call returns a cleanup that cancels that write. */
export function createBatchedFormDataSetter(write: (changes: FDBatchedValue[]) => void) {
  let pending: Set<{ change: FDBatchedValue }> | undefined;

  return (change: FDBatchedValue) => {
    if (!pending) {
      const batch = new Set<{ change: FDBatchedValue }>();
      pending = batch;
      queueMicrotask(() => {
        pending = undefined;
        if (batch.size) {
          const changes = Array.from(batch, (entry) => entry.change);
          batch.clear();
          write(changes);
        }
      });
    }

    const batch = pending;
    const entry = { change };
    batch.add(entry);
    return () => {
      batch.delete(entry);
    };
  };
}
