import React, { Fragment, useEffect, useMemo } from 'react';

import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorCondition,
  GeneratorRunProvider,
  StageAddNodes,
  StageEvaluateExpressions,
} from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildren } from 'src/utils/layout/generator/LayoutSetGenerator';
import { useDef, useExpressionResolverProps } from 'src/utils/layout/generator/NodeGenerator';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { CompDef } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';
import type { ChildClaims, ChildIdMutator, ChildMutator } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  RepChildrenInternalState,
  RepChildrenRow,
  RepeatingChildrenPlugin,
} from 'src/utils/layout/plugins/RepeatingChildrenPlugin';

interface Props {
  claims: ChildClaims | undefined;
  plugin: RepeatingChildrenPlugin;
}

export function NodeRepeatingChildren(props: Props) {
  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <NodeRepeatingChildrenWorker {...props} />
    </GeneratorCondition>
  );
}

const emptyObject = {};
function NodeRepeatingChildrenWorker({ claims, plugin }: Props) {
  const { dataModelGroupBinding: binding, externalProp, multiPageSupport } = plugin.settings;
  const item = GeneratorInternal.useIntermediateItem();
  const groupBinding = item?.dataModelBindings?.[binding];
  const numRows = FD.useFreshNumRows(groupBinding);
  const multiPage = multiPageSupport && dot.pick(multiPageSupport, item) === true;
  const multiPageMapping = useMemo(
    () => (multiPage ? makeMultiPageMapping(dot.pick(externalProp, item)) : undefined),
    [item, externalProp, multiPage],
  );

  return (
    <GeneratorRunProvider>
      {Array.from({ length: numRows }).map((_, index) => (
        <Fragment key={index}>
          {/* Do not remove this space.
              React's `getHostSibling` function can be very slow for renderless components,
              this will make sure it finds the sibling immediately by adding a `HostText` fiber-node directly below.
              The space will be added to the DOM, but should not be visible.
              See https://github.com/facebook/react/blob/ed15d5007ca7ee4d61294c741ce3e858d3c1d461/packages/react-reconciler/src/ReactFiberCommitHostEffects.js#L222-L226
          */}{' '}
          <GenerateRow
            rowIndex={index}
            groupBinding={groupBinding}
            claims={claims ?? emptyObject}
            multiPageMapping={multiPageMapping}
            plugin={plugin}
          />
        </Fragment>
      ))}
    </GeneratorRunProvider>
  );
}

interface GenerateRowProps {
  rowIndex: number;
  claims: ChildClaims;
  groupBinding: IDataModelReference;
  multiPageMapping: MultiPageMapping | undefined;
  plugin: RepeatingChildrenPlugin;
}

const GenerateRow = React.memo(function GenerateRow({
  rowIndex,
  claims,
  groupBinding,
  multiPageMapping,
  plugin,
}: GenerateRowProps) {
  const node = GeneratorInternal.useParent() as LayoutNode;
  const removeRow = NodesInternal.useRemoveRow();
  const depth = GeneratorInternal.useDepth();
  const directMutators = useMemo(() => [mutateMultiPageIndex(multiPageMapping)], [multiPageMapping]);

  const recursiveMutators = useMemo(
    () => [
      mutateComponentId(rowIndex),
      mutateDataModelBindings(rowIndex, groupBinding),
      mutateMapping(rowIndex, depth),
    ],
    [rowIndex, depth, groupBinding],
  );

  useEffect(
    () => () => {
      removeRow(node, plugin);
    },
    [node, plugin, removeRow],
  );

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      groupBinding={groupBinding}
      directMutators={directMutators}
      idMutators={[mutateComponentIdPlain(rowIndex)]}
      recursiveMutators={recursiveMutators}
    >
      <MaintainRowUuid
        groupBinding={groupBinding}
        plugin={plugin}
      />
      <GeneratorCondition
        stage={StageEvaluateExpressions}
        mustBeAdded='all'
      >
        <ResolveRowExpressions plugin={plugin} />
      </GeneratorCondition>
      <GenerateNodeChildren
        claims={claims}
        pluginKey={plugin.getKey()}
      />
    </GeneratorRowProvider>
  );
});

GenerateRow.displayName = 'GenerateRow';

interface ResolveRowProps {
  plugin: RepeatingChildrenPlugin;
}

function ResolveRowExpressions({ plugin }: ResolveRowProps) {
  const node = GeneratorInternal.useParent() as LayoutNode;
  const rowIndex = GeneratorInternal.useRowIndex()!;
  const nodeChildren = useNodeDirectChildren(node, rowIndex);
  const firstChild = nodeChildren ? nodeChildren[0] : undefined;

  const internal = NodesInternal.useNodeData(
    node,
    (d) => (d.item as unknown as { internal: RepChildrenInternalState } | undefined)?.internal,
  );
  const item = GeneratorInternal.useIntermediateItem();
  const props = useExpressionResolverProps(firstChild, item as CompExternal, rowIndex);

  const def = useDef(item!.type);
  const extras = useMemoDeepEqual(
    () => ({
      index: rowIndex,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((def as CompDef).evalExpressionsForRow(props as any) ?? {}),
      ...plugin.addRowProps(internal, rowIndex),
    }),
    [def, props, plugin, rowIndex, internal],
  );

  const isSet = NodesInternal.useNodeData(node, (data) => {
    const { uuid: _uuid, ...row } =
      (data.item?.[plugin.settings.internalProp]?.find(
        (row: RepChildrenRow) => row.index === rowIndex,
      ) as RepChildrenRow) ?? {};

    return deepEqual(row, extras);
  });

  NodesStateQueue.useSetRowExtras({ node, rowIndex, plugin, extras }, !isSet);

  return null;
}

function MaintainRowUuid({
  groupBinding,
  plugin,
}: {
  groupBinding: IDataModelReference | undefined;
  plugin: RepeatingChildrenPlugin;
}) {
  const parent = GeneratorInternal.useParent() as LayoutNode;
  const rowIndex = GeneratorInternal.useRowIndex() as number;
  const rowUuid = FD.useFreshRowUuid(groupBinding, rowIndex) as string;
  const existingUuid = NodesInternal.useNodeData(
    parent,
    (data) => data.item?.[plugin.settings.internalProp]?.find((row: RepChildrenRow) => row.index === rowIndex)?.uuid,
  );

  const isSet = rowUuid === existingUuid;
  NodesStateQueue.useSetRowExtras({ node: parent, rowIndex: rowIndex!, plugin, extras: { uuid: rowUuid } }, !isSet);

  return null;
}

interface MultiPageMapping {
  [childId: string]: number;
}

function makeMultiPageMapping(children: string[] | undefined): MultiPageMapping {
  const mapping: MultiPageMapping = {};
  for (const child of children ?? []) {
    const [pageIndex, childId] = child.split(':', 2);
    mapping[childId] = parseInt(pageIndex, 10);
  }
  return mapping;
}

function mutateMultiPageIndex(multiPageMapping: MultiPageMapping | undefined): ChildMutator {
  return (item) => {
    if (!multiPageMapping) {
      return;
    }

    const id = item.baseComponentId ?? item.id;
    const multiPageIndex = multiPageMapping[id];
    if (multiPageIndex !== undefined) {
      item['multiPageIndex'] = multiPageIndex;
    }
  };
}

export function mutateComponentIdPlain(rowIndex: number): ChildIdMutator {
  return (id) => `${id}-${rowIndex}`;
}

export function mutateComponentId(rowIndex: number): ChildMutator {
  return (item) => {
    item.baseComponentId = item.baseComponentId || item.id;
    item.id += `-${rowIndex}`;
  };
}

export function mutateDataModelBindings(rowIndex: number, groupBinding: IDataModelReference | undefined): ChildMutator {
  return (item) => {
    const bindings = item.dataModelBindings || {};
    for (const key of Object.keys(bindings)) {
      const binding = bindings[key] as IDataModelReference | undefined;
      if (!binding || !groupBinding || groupBinding.dataType !== binding.dataType) {
        continue;
      }
      bindings[key] = {
        dataType: binding.dataType,
        field: binding.field.replace(groupBinding.field, `${groupBinding.field}[${rowIndex}]`),
      };
    }
  };
}

export function mutateMapping(rowIndex: number, depth: number): ChildMutator {
  return (item) => {
    if ('mapping' in item && item.mapping) {
      // Pages start at 1, top-level nodes at 2, so for nodes inside repeating groups to start at 0 we subtract 2.
      const depthMarker = depth - 2;
      for (const key of Object.keys(item.mapping)) {
        const value = item.mapping[key];
        const newKey = key.replace(`[{${depthMarker}}]`, `[${rowIndex}]`);
        delete item.mapping[key];
        item.mapping[newKey] = value;
      }
    }
  };
}
