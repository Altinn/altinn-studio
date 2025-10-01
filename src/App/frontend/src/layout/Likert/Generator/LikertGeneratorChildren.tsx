import React, { useMemo } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { getLikertStartStopIndex } from 'src/layout/Likert/rowUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildren } from 'src/utils/layout/generator/LayoutSetGenerator';
import {
  mutateComponentId,
  mutateComponentIdPlain,
  mutateDataModelBindings,
  mutateMapping,
} from 'src/utils/layout/generator/NodeRepeatingChildren';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompIntermediate } from 'src/layout/layout';
import type { ChildClaims } from 'src/utils/layout/generator/GeneratorContext';

export function LikertGeneratorChildren() {
  return (
    <WhenParentAdded>
      <LikertGeneratorChildrenWorker />
    </WhenParentAdded>
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
        <GenerateLikertRow
          key={row.index}
          rowIndex={row.index}
          rowUuid={row.uuid}
          questionsBinding={questionsBinding}
        />
      ))}
    </>
  );
}

interface GenerateRowProps {
  rowIndex: number;
  rowUuid: string;
  questionsBinding: IDataModelReference;
}

const GenerateLikertRow = React.memo((props: GenerateRowProps) => (
  <DataModelLocationProvider
    groupBinding={props.questionsBinding}
    rowIndex={props.rowIndex}
  >
    <GenerateLikertRowInner {...props} />
  </DataModelLocationProvider>
));
GenerateLikertRow.displayName = 'GenerateLikertRow';

const GenerateLikertRowInner = React.memo(function ({ rowIndex, questionsBinding }: GenerateRowProps) {
  const parentItem = GeneratorInternal.useIntermediateItem() as CompIntermediate<'Likert'>;
  const depth = GeneratorInternal.useDepth();

  const childId = makeLikertChildId(parentItem.id);

  const childClaims = useMemo((): ChildClaims => {
    const out: ChildClaims = new Set();
    out.add(childId);
    return out;
  }, [childId]);

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
    >
      <GenerateNodeChildren claims={childClaims} />
    </GeneratorRowProvider>
  );
});

GenerateLikertRowInner.displayName = 'GenerateLikertRowInner';
