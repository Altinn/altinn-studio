import React, { useMemo } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { getLikertStartStopIndex } from 'src/layout/Likert/rowUtils';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, GeneratorRunProvider, StageAddNodes } from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildrenWithStaticLayout } from 'src/utils/layout/generator/LayoutSetGenerator';
import {
  mutateComponentId,
  mutateComponentIdPlain,
  mutateDataModelBindings,
  mutateMapping,
} from 'src/utils/layout/generator/NodeRepeatingChildren';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternalExact, CompIntermediate } from 'src/layout/layout';
import type { ChildClaims } from 'src/utils/layout/generator/GeneratorContext';

export function LikertGeneratorChildren() {
  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <LikertGeneratorChildrenWorker />
    </GeneratorCondition>
  );
}

function LikertGeneratorChildrenWorker() {
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

export function makeLikertChildId(parentId: string, rowIndex: number | undefined) {
  if (rowIndex === undefined) {
    return `${parentId}-item`;
  }
  return `${parentId}-item-${rowIndex}`;
}

const GenerateRow = React.memo(function GenerateRow({ rowIndex, questionsBinding }: GenerateRowProps) {
  const parentItem = GeneratorInternal.useIntermediateItem() as CompIntermediate<'Likert'>;
  const depth = GeneratorInternal.useDepth();

  const childId = makeLikertChildId(parentItem.id, undefined); // This needs to be the base ID

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
      columns: parentItem.columns,
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

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      idMutators={[mutateComponentIdPlain(rowIndex)]}
      recursiveMutators={recursiveMutators}
      groupBinding={questionsBinding}
      forceHidden={false}
    >
      <GenerateNodeChildrenWithStaticLayout
        claims={childClaims}
        staticLayoutMap={layoutMap}
      />
    </GeneratorRowProvider>
  );
});

GenerateRow.displayName = 'GenerateRow';
