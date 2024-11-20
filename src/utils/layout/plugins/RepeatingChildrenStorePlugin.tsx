import deepEqual from 'fast-deep-equal';

import { NodesReadiness, setReadiness } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { CompTypes } from 'src/layout/layout';
import type { LikertRowsPlugin } from 'src/layout/Likert/Generator/LikertRowsPlugin';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { RepChildrenRow, RepeatingChildrenPlugin } from 'src/utils/layout/plugins/RepeatingChildrenPlugin';

type Plugin = RepeatingChildrenPlugin | LikertRowsPlugin;

export interface SetRowExtrasRequest<T extends CompTypes = CompTypes> {
  node: LayoutNode<T>;
  rowIndex: number;
  plugin: Plugin;
  extras: unknown;
}

export interface RepeatingChildrenStorePluginConfig {
  extraFunctions: {
    setRowExtras: (requests: SetRowExtrasRequest[]) => void;
    removeRow: (node: LayoutNode, plugin: Plugin) => void;
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
          const newPartialItems: {
            [nodeId: string]: { [internalProp: string]: (RepChildrenRow | undefined)[] | undefined } | undefined;
          } = {};

          for (const { node, rowIndex, plugin, extras } of requests) {
            if (typeof extras !== 'object' || !extras) {
              throw new Error('Extras must be an object');
            }

            const internalProp = plugin.settings.internalProp;
            const data = nodeData[node.id];

            const existingRows =
              newPartialItems[node.id]?.[internalProp] ??
              (data?.item?.[internalProp] as (RepChildrenRow | undefined)[] | undefined);
            if (!existingRows) {
              continue;
            }

            const existingRow = existingRows[rowIndex] ?? ({} as RepChildrenRow);
            const nextRow = { ...existingRow, ...extras, index: rowIndex } as RepChildrenRow;
            if (deepEqual(existingRow, nextRow)) {
              continue;
            }

            changes = true;
            newPartialItems[node.id] ??= {};
            newPartialItems[node.id]![internalProp] ??= [...(existingRows || [])];
            newPartialItems[node.id]![internalProp]![rowIndex] = nextRow;
          }

          for (const [nodeId, partialItem] of Object.entries(newPartialItems)) {
            const data = nodeData[nodeId];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeData[nodeId] = { ...data, item: { ...data.item, ...partialItem } as any };
          }

          return changes
            ? { nodeData, ...setReadiness({ state, target: NodesReadiness.NotReady, reason: 'Row extras set' }) }
            : {};
        });
      },
      removeRow: (node, plugin) => {
        set((state) => {
          const nodeData = { ...state.nodeData };
          const thisNode = nodeData[node.id];
          if (!thisNode) {
            return {};
          }
          const { internalProp } = plugin.settings;
          const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
          if (!existingRows || !existingRows[existingRows.length - 1]) {
            return {};
          }

          // When removing rows, we'll always remove the last one. There is no such thing as removing a row in the
          // middle, as the indexes will always re-flow to the total number of rows left.
          const newRows = existingRows.slice(0, -1);

          // In these rows, all the UUIDs will change now that we've removed one. Removing these from existing rows
          // so that we don't have stale UUIDs in the state while waiting for them to be set.
          for (const rowIdx in newRows) {
            const row = { ...newRows[rowIdx] };
            if (row.uuid) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              delete (row as any).uuid;
            }
            newRows[rowIdx] = row;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeData[node.id] = { ...thisNode, item: { ...thisNode.item, [internalProp]: newRows } as any };

          return {
            nodeData,
            ...setReadiness({ state, target: NodesReadiness.NotReady, reason: 'Row removed', newNodes: true }),
          };
        });
      },
    };
  }

  extraHooks(store: NodesStoreFull): RepeatingChildrenStorePluginConfig['extraHooks'] {
    return {
      useSetRowExtras: () => store.useStaticSelector((state) => state.setRowExtras),
      useRemoveRow: () => store.useStaticSelector((state) => state.removeRow),
    };
  }
}
