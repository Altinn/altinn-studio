import React, { useMemo } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { getLikertStartStopIndex } from 'src/utils/formLayout';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, GeneratorRunProvider, StageAddNodes } from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildrenWithStaticLayout } from 'src/utils/layout/generator/LayoutSetGenerator';
import {
  mutateComponentId,
  mutateComponentIdPlain,
  mutateDataModelBindings,
  mutateMapping,
} from 'src/utils/layout/generator/NodeRepeatingChildren';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternalExact, CompIntermediate } from 'src/layout/layout';
import type { LikertRow, LikertRowsPlugin } from 'src/layout/Likert/Generator/LikertRowsPlugin';
import type { ChildClaims } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  plugin: LikertRowsPlugin;
}

export function LikertGeneratorChildren({ plugin }: Props) {
  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <LikertGeneratorChildrenWorker plugin={plugin} />
    </GeneratorCondition>
  );
}

function LikertGeneratorChildrenWorker({ plugin }: Props) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<'Likert'>;
  const questionsBinding = item?.dataModelBindings?.questions;
  const rows = FD.useFreshRows(questionsBinding);

  const lastIndex = rows.length - 1;
  const { startIndex, stopIndex } = getLikertStartStopIndex(lastIndex, item.filter);
  const filteredRows = rows.slice(startIndex, stopIndex + 1);

  return (
    <>
      {filteredRows.map((row) => (
        <GeneratorRunProvider key={row.index}>
          <GenerateRow
            rowIndex={row.index}
            rowUuid={row.uuid}
            questionsBinding={questionsBinding}
            plugin={plugin}
          />
        </GeneratorRunProvider>
      ))}
    </>
  );
}

interface GenerateRowProps {
  rowIndex: number;
  rowUuid: string;
  questionsBinding: IDataModelReference;
  plugin: LikertRowsPlugin;
}

const GenerateRow = React.memo(function GenerateRow({ rowIndex, questionsBinding, plugin }: GenerateRowProps) {
  const parentItem = GeneratorInternal.useIntermediateItem() as CompIntermediate<'Likert'>;
  const node = GeneratorInternal.useParent() as LayoutNode<'Likert'>;
  const depth = GeneratorInternal.useDepth();

  const childId = `${parentItem.id}-item`;

  const externalItem = useMemo(
    (): CompExternalExact<'LikertItem'> => ({
      id: childId,
      type: 'LikertItem',
      textResourceBindings: {
        title: parentItem.textResourceBindings?.questions,
      },
      dataModelBindings: {
        simpleBinding: parentItem.dataModelBindings?.answer,
      },
      options: parentItem.options,
      optionsId: parentItem.optionsId,
      mapping: parentItem.mapping,
      required: parentItem.required,
      secure: parentItem.secure,
      queryParameters: parentItem.queryParameters,
      readOnly: parentItem.readOnly,
      sortOrder: parentItem.sortOrder,
      showValidations: parentItem.showValidations,
      grid: parentItem.grid,
      source: parentItem.source,
      hidden: parentItem.hidden,
      pageBreak: parentItem.pageBreak,
      renderAsSummary: parentItem.renderAsSummary,
    }),
    [parentItem, childId],
  );

  const childClaims = useMemo(
    (): ChildClaims => ({
      [childId]: {
        pluginKey: 'LikertRowsPlugin',
      },
    }),
    [childId],
  );

  const layoutMap = useMemo(
    (): Record<string, CompExternalExact<'LikertItem'>> => ({
      [childId]: externalItem,
    }),
    [childId, externalItem],
  );

  const recursiveMutators = useMemo(
    () => [
      mutateComponentId(rowIndex),
      mutateDataModelBindings(rowIndex, questionsBinding),
      mutateMapping(rowIndex, depth),
    ],
    [rowIndex, depth, questionsBinding],
  );

  NodesStateQueue.useRemoveRow({ node, plugin });

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      idMutators={[mutateComponentIdPlain(rowIndex)]}
      recursiveMutators={recursiveMutators}
      groupBinding={questionsBinding}
    >
      <GenerateNodeChildrenWithStaticLayout
        claims={childClaims}
        staticLayoutMap={layoutMap}
      />
      <MaintainReferences
        binding={questionsBinding}
        plugin={plugin}
        childId={childId}
      />
    </GeneratorRowProvider>
  );
});

interface MaintainReferencesProps {
  binding: IDataModelReference;
  plugin: LikertRowsPlugin;
  childId: string;
}

function MaintainReferences({ binding, plugin, childId }: MaintainReferencesProps) {
  const parent = GeneratorInternal.useParent() as LayoutNode;
  const rowIndex = GeneratorInternal.useRowIndex() as number;
  const rowUuid = FD.useFreshRowUuid(binding, rowIndex) as string;

  const existingUuid = NodesInternal.useNodeData(
    parent,
    (data) =>
      data.item?.[plugin.settings.internalProp]?.find((row: LikertRow | undefined) => row && row.index === rowIndex)
        ?.uuid,
  );

  const isSet = rowUuid === existingUuid;
  const extras = { uuid: rowUuid, itemNodeId: `${childId}-${rowIndex}` } satisfies Partial<LikertRow>;
  NodesStateQueue.useSetRowExtras({ node: parent, rowIndex: rowIndex!, plugin, extras }, !isSet);

  return null;
}

GenerateRow.displayName = 'GenerateRow';
