import { createContext } from 'src/core/contexts/context';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface NodeInspectorContextValue {
  selectedNodeId: string | undefined;
  selectNode: (id: string) => void;
  node: LayoutNode | undefined;
}

const { Provider, useCtx } = createContext<NodeInspectorContextValue>({
  name: 'NodeInspectorContext',
  required: true,
});

export const useNodeInspectorContext = () => useCtx();
export const NodeInspectorContextProvider = Provider;
