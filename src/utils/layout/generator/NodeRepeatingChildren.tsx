import React, { useEffect, useMemo } from 'react';

import dot from 'dot-object';

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
import type { ChildClaims, ChildMutator } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { RepChildrenRow } from 'src/utils/layout/plugins/RepeatingChildrenPlugin';

interface Props {
  claims: ChildClaims;
  internalProp: string;
  externalProp: string;
  binding: string;
  multiPageSupport: false | string;
  pluginKey: string;
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

function NodeRepeatingChildrenWorker({
  claims,
  binding,
  multiPageSupport,
  externalProp,
  internalProp,
  pluginKey,
}: Props) {
  const item = GeneratorInternal.useIntermediateItem();
  const groupBinding = item?.dataModelBindings?.[binding];
  const numRows = FD.useFreshNumRows(groupBinding);
  const multiPage = multiPageSupport !== false && dot.pick(multiPageSupport, item) === true;
  const multiPageMapping = useMemo(
    () => (multiPage ? makeMultiPageMapping(dot.pick(externalProp, item)) : undefined),
    [item, externalProp, multiPage],
  );

  return (
    <>
      {Array.from({ length: numRows }).map((_, index) => (
        <GeneratorRunProvider key={index}>
          <GenerateRow
            rowIndex={index}
            groupBinding={groupBinding}
            claims={claims}
            multiPageMapping={multiPageMapping}
            internalProp={internalProp}
            pluginKey={pluginKey}
          />
        </GeneratorRunProvider>
      ))}
    </>
  );
}

interface GenerateRowProps {
  rowIndex: number;
  claims: ChildClaims;
  groupBinding: IDataModelReference;
  multiPageMapping: MultiPageMapping | undefined;
  internalProp: string;
  pluginKey: string;
}

const GenerateRow = React.memo(function GenerateRow({
  rowIndex,
  claims,
  groupBinding,
  multiPageMapping,
  internalProp,
  pluginKey,
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
      removeRow(node, internalProp);
    },
    [node, internalProp, removeRow],
  );

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      groupBinding={groupBinding}
      directMutators={directMutators}
      recursiveMutators={recursiveMutators}
    >
      <MaintainRowUuid
        groupBinding={groupBinding}
        internalProp={internalProp}
      />
      <GeneratorCondition
        stage={StageEvaluateExpressions}
        mustBeAdded='all'
      >
        <ResolveRowExpressions internalProp={internalProp} />
      </GeneratorCondition>
      <GenerateNodeChildren
        claims={claims}
        pluginKey={pluginKey}
      />
    </GeneratorRowProvider>
  );
});

GenerateRow.displayName = 'GenerateRow';

interface ResolveRowProps {
  internalProp: string;
}

function ResolveRowExpressions({ internalProp }: ResolveRowProps) {
  const parent = GeneratorInternal.useParent() as LayoutNode;
  const rowIndex = GeneratorInternal.useRowIndex();
  const nodeChildren = useNodeDirectChildren(parent as LayoutNode, rowIndex);
  const firstChild = nodeChildren ? nodeChildren[0] : undefined;

  const item = GeneratorInternal.useIntermediateItem();
  const props = useExpressionResolverProps(firstChild, item as CompExternal, rowIndex);

  const def = useDef(item!.type);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedRowExtras = useMemoDeepEqual(() => (def as CompDef).evalExpressionsForRow(props as any), [def, props]);

  NodesStateQueue.useSetRowExtras({ node: parent, rowIndex: rowIndex!, internalProp, extras: resolvedRowExtras });

  return null;
}

function MaintainRowUuid({
  groupBinding,
  internalProp,
}: {
  groupBinding: IDataModelReference | undefined;
  internalProp: string;
}) {
  const parent = GeneratorInternal.useParent() as LayoutNode;
  const rowIndex = GeneratorInternal.useRowIndex() as number;
  const rowUuid = FD.useFreshRowUuid(groupBinding, rowIndex) as string;
  const existingUuid = NodesInternal.useNodeData(
    parent,
    (data) => data.item?.[internalProp]?.find((row: RepChildrenRow) => row.index === rowIndex)?.uuid,
  );

  const isSet = rowUuid === existingUuid;
  NodesStateQueue.useSetRowUuid({ node: parent, rowIndex: rowIndex!, internalProp, rowUuid }, !isSet);

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
