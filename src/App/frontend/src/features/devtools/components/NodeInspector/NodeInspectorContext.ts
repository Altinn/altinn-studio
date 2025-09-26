import { createContext } from 'src/core/contexts/context';

interface NodeInspectorContextValue {
  selectedNodeId: string | undefined;
  selectedBaseId: string | undefined;
  selectNode: (nodeId: string, baseId: string) => void;
}

const { Provider, useCtx } = createContext<NodeInspectorContextValue>({
  name: 'NodeInspectorContext',
  required: true,
});

export const useNodeInspectorContext = () => useCtx();
export const NodeInspectorContextProvider = Provider;
