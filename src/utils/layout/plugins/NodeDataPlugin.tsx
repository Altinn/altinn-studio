import type { NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';

export interface NodeDataPluginConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraFunctions?: Record<string, (...args: any[]) => any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraHooks?: Record<string, (...args: any[]) => any>;
}

export type NodeDataPluginSetState = (
  fnOrState: ((state: NodesContext) => Partial<NodesContext>) | Partial<NodesContext>,
) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConfigFromNodeDataPlugin<C extends NodeDataPlugin<any>> =
  C extends NodeDataPlugin<infer Config> ? Config : never;

export abstract class NodeDataPlugin<Config extends NodeDataPluginConfig> {
  abstract extraFunctions(set: NodeDataPluginSetState): Config['extraFunctions'];
  abstract extraHooks(store: NodesStoreFull): Config['extraHooks'];
}
