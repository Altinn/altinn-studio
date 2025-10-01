import type { NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';

interface NodeDataPluginConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraFunctions?: Record<string, (...args: any[]) => any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraHooks?: Record<string, (...args: any[]) => any>;
}

export type NodeDataPluginSetState = (
  fnOrState: ((state: NodesContext) => Partial<NodesContext>) | Partial<NodesContext>,
) => void;

export abstract class NodeDataPlugin<Config extends NodeDataPluginConfig> {
  abstract extraFunctions(set: NodeDataPluginSetState): Config['extraFunctions'];
  abstract extraHooks(store: NodesStoreFull): Config['extraHooks'];
}
