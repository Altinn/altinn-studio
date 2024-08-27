import deepEqual from 'fast-deep-equal';

import { NodesReadiness } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { RepChildrenRow } from 'src/utils/layout/plugins/RepeatingChildrenPlugin';
import type { BaseRow } from 'src/utils/layout/types';

export interface SetRowExtrasRequest<T extends CompTypes = CompTypes> {
  node: LayoutNode<T>;
  row: BaseRow;
  internalProp: string;
  extras: unknown;
}

export interface RepeatingChildrenStorePluginConfig {
  extraFunctions: {
    setRowExtras: (requests: SetRowExtrasRequest[]) => void;
    removeRow: (node: LayoutNode, internalProp: string) => void;
  };
  extraHooks: {
    useSetRowExtras: () => RepeatingChildrenStorePluginConfig['extraFunctions']['setRowExtras'];
    useRemoveRow: () => RepeatingChildrenStorePluginConfig['extraFunctions']['removeRow'];
  };
}

export class RepeatingChildrenStorePlugin extends NodeDataPlugin<RepeatingChildrenStorePluginConfig> {
  extraFunctions(set: NodeDataPluginSetState): RepeatingChildrenStorePluginConfig['extraFunctions'] {
    return {
      setRowExtras: (requests) => {
        set((state) => {
          let changes = false;
          const nodeData = { ...state.nodeData };
          for (const { node, row, internalProp, extras } of requests) {
            if (typeof extras !== 'object' || !extras) {
              throw new Error('Extras must be an object');
            }

            const thisNode = nodeData[node.id];
            if (!thisNode) {
              continue;
            }

            const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
            const existingRow = existingRows ? existingRows[row.index] : undefined;
            const nextRow = { ...existingRow, ...extras, ...row } as RepChildrenRow;
            if (existingRows && existingRow && deepEqual(existingRow, nextRow)) {
              continue;
            }

            if (row.index !== undefined) {
              changes = true;
              const newRows = [...(existingRows || [])];
              newRows[row.index] = nextRow;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeData[node.id] = { ...thisNode, item: { ...thisNode.item, [internalProp]: newRows } as any };
            }
          }

          return changes ? { nodeData, readiness: NodesReadiness.NotReady } : {};
        });
      },
      removeRow: (node, internalProp) => {
        set((state) => {
          const nodeData = { ...state.nodeData };
          const thisNode = nodeData[node.id];
          if (!thisNode) {
            return {};
          }
          const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
          if (!existingRows) {
            return {};
          }
          const lastRow = existingRows[existingRows.length - 1];
          if (!lastRow) {
            return {};
          }

          // When removing rows, we'll always remove the last one. There is no such thing as removing a row in the
          // middle, as the indexes will always re-flow to the total number of rows left.
          const newRows = existingRows.slice(0, -1);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeData[node.id] = { ...thisNode, item: { ...thisNode.item, [internalProp]: newRows } as any };

          return { nodeData, readiness: NodesReadiness.NotReady, addRemoveCounter: state.addRemoveCounter + 1 };
        });
      },
    };
  }

  extraHooks(store: NodesStoreFull): RepeatingChildrenStorePluginConfig['extraHooks'] {
    return {
      useSetRowExtras: () => store.useSelector((state) => state.setRowExtras),
      useRemoveRow: () => store.useSelector((state) => state.removeRow),
    };
  }
}
