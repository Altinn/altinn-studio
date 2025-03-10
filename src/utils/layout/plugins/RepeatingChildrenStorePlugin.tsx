import deepEqual from 'fast-deep-equal';

import { NodesReadiness, setReadiness } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { CompTypes, ILayouts } from 'src/layout/layout';
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

export interface RemoveRowRequest<T extends CompTypes = CompTypes> {
  node: LayoutNode<T>;
  plugin: Plugin;
  layouts: ILayouts;
}

export interface RepeatingChildrenStorePluginConfig {
  extraFunctions: {
    setRowExtras: (requests: SetRowExtrasRequest[]) => void;
    removeRows: (requests: RemoveRowRequest[]) => void;
  };
  extraHooks: {
    useSetRowExtras: () => RepeatingChildrenStorePluginConfig['extraFunctions']['setRowExtras'];
    useRemoveRows: () => RepeatingChildrenStorePluginConfig['extraFunctions']['removeRows'];
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
      removeRows: (requests) => {
        set((state) => {
          const nodeData = { ...state.nodeData };
          const newPartialItems: {
            [nodeId: string]: { [internalProp: string]: (RepChildrenRow | undefined)[] | undefined } | undefined;
          } = {};

          let count = 0;
          for (const { node, plugin, layouts } of requests) {
            if (layouts !== state.layouts) {
              // The layouts have changed since the request was added, so there's no need to remove the row (it was
              // automatically removed when resetting the NodesContext state upon the layout change)
              continue;
            }

            const thisNode = nodeData[node.id];
            if (!thisNode) {
              continue;
            }
            const { internalProp } = plugin.settings;
            const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
            if (!existingRows || !existingRows[existingRows.length - 1]) {
              continue;
            }

            let newRows: RepChildrenRow[];

            // When removing rows, we'll always remove the last one. There is no such thing as removing a row in the
            // middle, as the indexes will always re-flow to the total number of rows left.
            if (newPartialItems[node.id] && newPartialItems[node.id]![internalProp]) {
              newRows = newPartialItems[node.id]![internalProp] as RepChildrenRow[];
              newRows.pop();
            } else {
              newRows = existingRows.slice(0, -1);

              // In these rows, all the UUIDs will change now that we've removed one. Removing these from existing rows
              // so that we don't have stale UUIDs in the state while waiting for them to be set.
              for (const rowIdx in newRows) {
                if (newRows[rowIdx].uuid) {
                  const row = { ...newRows[rowIdx] };
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  delete (row as any).uuid;
                  newRows[rowIdx] = row;
                }
              }
            }

            count++;
            newPartialItems[node.id] ??= {};
            newPartialItems[node.id]![internalProp] = newRows;
          }

          if (count === 0) {
            return {};
          }

          for (const [nodeId, partialItem] of Object.entries(newPartialItems)) {
            const data = nodeData[nodeId];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeData[nodeId] = { ...data, item: { ...data.item, ...partialItem } as any };
          }

          return {
            nodeData,
            ...setReadiness({ state, target: NodesReadiness.NotReady, reason: 'Rows removed' }),
          };
        });
      },
    };
  }

  extraHooks(store: NodesStoreFull): RepeatingChildrenStorePluginConfig['extraHooks'] {
    return {
      useSetRowExtras: () => store.useStaticSelector((state) => state.setRowExtras),
      useRemoveRows: () => store.useStaticSelector((state) => state.removeRows),
    };
  }
}
