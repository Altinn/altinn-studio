import type { FormStoreSet } from 'src/features/form/FormContext';

interface NodeDataPluginConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraFunctions?: Record<string, (...args: any[]) => any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraHooks?: Record<string, (...args: any[]) => any>;
}

export abstract class NodeDataPlugin<Config extends NodeDataPluginConfig> {
  abstract extraFunctions(set: FormStoreSet): Config['extraFunctions'];
  abstract extraHooks(): Config['extraHooks'];
}
