import React from 'react';

import { BaseTable, useIsMobileOrTablet } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import dot from 'dot-object';

import { Caption } from 'src/components/form/caption/Caption';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import {
  getMobileTableHeaders,
  getSelectionMode,
  ListComponent,
  ListMobileRowContent,
} from 'src/layout/List/ListComponent';
import classes from 'src/layout/List/ListComponent.module.css';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useSummaryCaptionProps } from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Row = Record<string, string | number | boolean>;

export const ListSummary = (props: Summary2Props) => {
  const bindings = useDataModelBindingsFor(props.targetBaseComponentId, 'List');
  if (getSelectionMode(bindings) === 'readonly') {
    return (
      <SummaryFlex
        targetBaseId={props.targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <ListComponent
          baseComponentId={props.targetBaseComponentId}
          isSummary
        />
      </SummaryFlex>
    );
  }
  return <SelectableListSummary {...props} />;
};

const SelectableListSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'List'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const isMobileOrTablet = useIsMobileOrTablet();
  const pdfModeActive = usePdfModeActive();
  const mobileView = isMobileOrTablet && !pdfModeActive;
  const displayData = useDisplayData(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const config = useComponentConfig(targetBaseComponentId, 'List');
  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'List');
  const mobileHeaders = getMobileTableHeaders(config.tableHeaders, config.tableHeadersMobile);
  const boundMobileHeaders = Object.fromEntries(
    Object.entries(mobileHeaders).filter(([key]) => dataModelBindings?.[key]),
  );
  const required = useEvalExpression(config.required, Expressions.List.required);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.List.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.List.textResourceBindings.title,
  );

  const title = summaryTitle || resolvedTitle;
  const captionProps = useSummaryCaptionProps(targetBaseComponentId, title);
  const { formData } = useDataModelBindings(dataModelBindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');
  const relativeCheckedPath =
    dataModelBindings?.checked && dataModelBindings?.group
      ? dataModelBindings.checked.field.replace(`${dataModelBindings.group.field}.`, '')
      : undefined;
  const displayRows = (formData?.group as Row[])?.filter((row) => {
    if (!relativeCheckedPath) {
      return true;
    }
    return dot.pick(relativeCheckedPath, row) === true;
  });
  if (displayRows?.length > 0) {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.SomeUserContent}
      >
        <div className={classes.listContainer}>
          <div className={classes.headerContainer}>
            <EditButton
              className={classes.editButton}
              targetBaseComponentId={targetBaseComponentId}
            />
          </div>
          <BaseTable>
            {(title || captionProps.description || captionProps.helpText) && (
              <Caption
                {...captionProps}
                className={classes.tableCaption}
                title={title && <Lang id={title} />}
              />
            )}
            {config.tableColumns && !mobileView && (
              <colgroup>
                {Object.keys(config.tableHeaders).map((key) => (
                  <col
                    key={key}
                    style={{ width: config.tableColumns?.[key]?.width }}
                  />
                ))}
              </colgroup>
            )}
            {!mobileView && (
              <BaseTable.Head>
                <BaseTable.Row>
                  {Object.entries(config.tableHeaders).map(([key, value]) => (
                    <BaseTable.HeaderCell key={key}>
                      <Lang id={value} />
                    </BaseTable.HeaderCell>
                  ))}
                </BaseTable.Row>
              </BaseTable.Head>
            )}
            <BaseTable.Body>
              {displayRows?.map((row, rowIndex) => {
                const getValue = (key: string) => {
                  const binding = dataModelBindings?.[key];
                  if (!binding || !dataModelBindings?.group) {
                    return undefined;
                  }
                  const relativePath = binding.field.replace(`${dataModelBindings.group.field}.`, '');
                  return dot.pick(relativePath, row);
                };
                return (
                  <BaseTable.Row key={rowIndex}>
                    {mobileView ? (
                      <BaseTable.Cell align='left'>
                        <ListMobileRowContent
                          headers={boundMobileHeaders}
                          renderValue={getValue}
                        />
                      </BaseTable.Cell>
                    ) : (
                      Object.keys(config.tableHeaders).map((key) => (
                        <BaseTable.Cell
                          key={key}
                          align='left'
                        >
                          {getValue(key)}
                        </BaseTable.Cell>
                      ))
                    )}
                  </BaseTable.Row>
                );
              })}
            </BaseTable.Body>
          </BaseTable>
        </div>
      </SummaryFlex>
    );
  }
  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
    >
      <SingleValueSummary
        title={title}
        displayData={displayData}
        errors={errors}
        targetBaseComponentId={targetBaseComponentId}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
