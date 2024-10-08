import type { IInstance } from 'src/types/shared';

export function cleanUpInstanceData<T extends IInstance | undefined>(instance: T): T | undefined {
  if (!instance) {
    return undefined;
  }

  if (instance && 'process' in instance) {
    // Even though the process state is part of the instance data we fetch from the server, we don't want to expose it
    // to the rest of the application. This is because the process state is also fetched separately, and that
    // is the one we want to use, as it contains more information about permissions than the instance data provides.
    delete instance.process;
  }

  return instance;
}
