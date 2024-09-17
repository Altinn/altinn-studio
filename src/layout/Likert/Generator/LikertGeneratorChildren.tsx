import React, { useMemo } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { getLikertStartStopIndex } from 'src/utils/formLayout';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorCondition,
  GeneratorRunProvider,
  GeneratorStages,
  StageAddNodes,
} from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildrenWithStaticLayout } from 'src/utils/layout/generator/LayoutSetGenerator';
import {
  mutateComponentId,
  mutateDataModelBindings,
  mutateMapping,
} from 'src/utils/layout/generator/NodeRepeatingChildren';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternalExact, CompIntermediate } from 'src/layout/layout';
import type { ChildClaims } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function LikertGeneratorChildren() {
  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <PerformWork />
    </GeneratorCondition>
  );
}

function PerformWork() {
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
}

function _GenerateRow({ rowIndex, questionsBinding }: GenerateRowProps) {
  const parentItem = GeneratorInternal.useIntermediateItem() as CompIntermediate<'Likert'>;
  const node = GeneratorInternal.useParent() as LayoutNode<'Likert'>;
  const removeRow = NodesInternal.useRemoveRow();
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

  GeneratorStages.AddNodes.useEffect(
    () => () => {
      removeRow(node, 'rows');
    },
    [node, removeRow],
  );

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      recursiveMutators={recursiveMutators}
    >
      <GenerateNodeChildrenWithStaticLayout
        claims={childClaims}
        staticLayoutMap={layoutMap}
      />
    </GeneratorRowProvider>
  );
}

const GenerateRow = React.memo(_GenerateRow);
GenerateRow.displayName = 'GenerateRow';
