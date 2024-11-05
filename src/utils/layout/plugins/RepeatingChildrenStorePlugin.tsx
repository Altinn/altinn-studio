import deepEqual from 'fast-deep-equal';

import { NodesReadiness } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { RepChildrenRow } from 'src/utils/layout/plugins/RepeatingChildrenPlugin';

interface BaseSetProps<T extends CompTypes> {
  node: LayoutNode<T>;
  rowIndex: number;
  internalProp: string;
}

export interface SetRowExtrasRequest<T extends CompTypes = CompTypes> extends BaseSetProps<T> {
  extras: unknown;
}

export interface SetRowUuidRequest<T extends CompTypes = CompTypes> extends BaseSetProps<T> {
  rowUuid: string;
}

export interface RepeatingChildrenStorePluginConfig {
  extraFunctions: {
    setRowExtras: (requests: SetRowExtrasRequest[]) => void;
    setRowUuids: (requests: SetRowUuidRequest[]) => void;
    removeRow: (node: LayoutNode, internalProp: string) => void;
  };
  extraHooks: {
    useSetRowExtras: () => RepeatingChildrenStorePluginConfig['extraFunctions']['setRowExtras'];
    useSetRowUuids: () => RepeatingChildrenStorePluginConfig['extraFunctions']['setRowUuids'];
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
          for (const { node, rowIndex, internalProp, extras } of requests) {
            if (typeof extras !== 'object' || !extras) {
              throw new Error('Extras must be an object');
            }

            const thisNode = nodeData[node.id];
            if (!thisNode) {
              continue;
            }

            const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
            if (!existingRows || !existingRows[rowIndex]) {
              continue;
            }

            const existingRow = existingRows ? existingRows[rowIndex] : undefined;
            const nextRow = { ...existingRow, ...extras, index: rowIndex } as RepChildrenRow;
            if (existingRows && existingRow && deepEqual(existingRow, nextRow)) {
              continue;
            }

            if (rowIndex !== undefined) {
              changes = true;
              const newRows = [...(existingRows || [])];
              newRows[rowIndex] = nextRow;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeData[node.id] = { ...thisNode, item: { ...thisNode.item, [internalProp]: newRows } as any };
            }
          }

          return changes ? { nodeData, readiness: NodesReadiness.NotReady } : {};
        });
      },
      setRowUuids: (requests) => {
        set((state) => {
          let changes = false;
          const nodeData = { ...state.nodeData };
          for (const { node, rowIndex, internalProp, rowUuid } of requests) {
            if (typeof rowUuid !== 'string') {
              throw new Error('Row UUID must be a string');
            }

            const thisNode = nodeData[node.id];
            if (!thisNode) {
              continue;
            }

            const existingRows = thisNode.item && (thisNode.item[internalProp] as RepChildrenRow[] | undefined);
            if (!existingRows || !existingRows[rowIndex]) {
              continue;
            }

            const existingRow = existingRows ? existingRows[rowIndex] : undefined;
            const nextRow = { ...existingRow, uuid: rowUuid, index: rowIndex } as RepChildrenRow;
            if (existingRows && existingRow && deepEqual(existingRow, nextRow)) {
              continue;
            }

            if (rowIndex !== undefined) {
              changes = true;
              const newRows = [...(existingRows || [])];
              newRows[rowIndex] = nextRow;
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

          return { nodeData, readiness: NodesReadiness.NotReady, addRemoveCounter: state.addRemoveCounter + 1 };
        });
      },
    };
  }

  extraHooks(store: NodesStoreFull): RepeatingChildrenStorePluginConfig['extraHooks'] {
    return {
      useSetRowExtras: () => store.useStaticSelector((state) => state.setRowExtras),
      useSetRowUuids: () => store.useStaticSelector((state) => state.setRowUuids),
      useRemoveRow: () => store.useStaticSelector((state) => state.removeRow),
    };
  }
}
