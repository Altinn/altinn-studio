import type { IInstance } from 'src/types/shared';

// Even though the process state is part of the instance data we fetch from the server, we don't want to expose it
// to the rest of the application. This is because the process state is also fetched separately, and that
// is the one we want to use, as it contains more information about permissions than the instance data provides.
export function removeProcessFromInstance(instance: IInstance & { process?: unknown }): IInstance {
  const { process: _process, ...rest } = instance;
  return rest;
}
