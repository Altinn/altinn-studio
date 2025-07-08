import React from 'react';

import { Heading, ValidationMessage } from '@digdir/designsystemet-react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import classes from 'src/layout/Likert/Summary2/LikertSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { EmptyChildrenBoundary, useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import {
  SummaryContains,
  SummaryFlex,
  SummaryFlexForContainer,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function LikertSummary({ targetBaseComponentId }: Summary2Props) {
  const emptyFieldText = useSummaryOverrides<'Likert'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const rows = useLikertRows(targetBaseComponentId);
  const { textResourceBindings, dataModelBindings, readOnly, required } = useItemWhenType(
    targetBaseComponentId,
    'Likert',
  );

  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  if (!rows.length || rows.length <= 0) {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
      >
        <SingleValueSummary
          title={<Lang id={textResourceBindings?.title} />}
          targetBaseComponentId={targetBaseComponentId}
          errors={errors}
          hideEditButton={readOnly}
          isCompact={isCompact}
          emptyFieldText={emptyFieldText}
        />
      </SummaryFlex>
    );
  }

  return (
    <EmptyChildrenBoundary>
      <SummaryFlexForContainer
        targetBaseId={targetBaseComponentId}
        hideWhen={hideEmptyFields}
      >
        <div className={classes.summaryItemWrapper}>
          <div className={classes.summaryItem}>
            <Heading
              data-size='xs'
              level={4}
            >
              <Lang id={textResourceBindings?.title} />
            </Heading>
          </div>
          {rows.filter(typedBoolean).map((row) => (
            <DataModelLocationProvider
              key={row.index}
              groupBinding={dataModelBindings.questions}
              rowIndex={row.index}
            >
              <LikertRowSummary
                rowBaseId={makeLikertChildId(targetBaseComponentId)}
                emptyFieldText={emptyFieldText}
                readOnly={readOnly}
                isCompact={isCompact}
              />
            </DataModelLocationProvider>
          ))}
          {errors?.map(({ message }) => (
            <ValidationMessage key={message.key}>
              <Lang
                id={message.key}
                params={message.params}
              />
            </ValidationMessage>
          ))}
        </div>
      </SummaryFlexForContainer>
    </EmptyChildrenBoundary>
  );
}

type LikertRowSummaryProps = {
  rowBaseId: string;
  emptyFieldText?: string;
  readOnly?: boolean;
  isCompact?: boolean;
};

function LikertRowSummary({ rowBaseId, emptyFieldText, readOnly, isCompact }: LikertRowSummaryProps) {
  const { textResourceBindings, required } = useItemWhenType(rowBaseId, 'LikertItem');
  const displayData = useDisplayData(rowBaseId);
  const validations = useUnifiedValidationsForNode(rowBaseId);
  const errors = validationsOfSeverity(validations, 'error');

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <SingleValueSummary
      title={<Lang id={textResourceBindings?.title} />}
      isCompact={isCompact}
      targetBaseComponentId={rowBaseId}
      displayData={displayData}
      errors={errors}
      hideEditButton={readOnly}
      emptyFieldText={emptyFieldText}
    />
  );
}
