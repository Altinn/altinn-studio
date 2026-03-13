import React from 'react';

import { Heading, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import { RepeatingGroupTableSummary } from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary';
import { RepGroupSummaryEditableProvider } from 'src/layout/RepeatingGroup/Summary2/RepGroupSummaryEditableContext';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import {
  ComponentSummary,
  SummaryContains,
  SummaryFlex,
  SummaryFlexForContainer,
  useSummarySoftHidden,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { RepGroupRow } from 'src/layout/RepeatingGroup/utils';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const RepeatingGroupSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const overrides = useSummaryOverrides<'RepeatingGroup'>(targetBaseComponentId);
  const display = overrides?.display ?? 'list';
  const isCompact = useSummaryProp('isCompact');
  const childIds = RepGroupHooks.useChildIds(targetBaseComponentId);
  const rows = RepGroupHooks.useVisibleRows(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const { textResourceBindings, dataModelBindings, minCount, tableColumns } = useItemWhenType(
    targetBaseComponentId,
    'RepeatingGroup',
  );
  const title = textResourceBindings?.summaryTitle || textResourceBindings?.title;
  const parent = FormBootstrap.useLayoutLookups().componentToParent[targetBaseComponentId];
  const isNested = parent?.type === 'node';
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const hiddenColumns = tableColumns
    ? Object.entries(tableColumns)
        .filter(([_, settings]) => settings.hidden === true)
        .map(([id]) => id)
    : [];
  const visibleChildIds = childIds.filter((id) => !hiddenColumns.includes(id));

  const required = minCount !== undefined && minCount > 0;
  const { className } = useSummarySoftHidden(hideEmptyFields && rows.length === 0 && !required);

  if (rows.length === 0) {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
        className={className}
      >
        <SingleValueSummary
          title={<Lang id={title} />}
          targetBaseComponentId={targetBaseComponentId}
          errors={errors}
          isCompact={isCompact}
          emptyFieldText={overrides?.emptyFieldText}
        />
      </SummaryFlex>
    );
  }

  if (display === 'table') {
    return (
      <SummaryFlexForContainer
        hideWhen={hideEmptyFields}
        targetBaseId={targetBaseComponentId}
      >
        <RepeatingGroupTableSummary baseComponentId={targetBaseComponentId} />
      </SummaryFlexForContainer>
    );
  }

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      <div
        className={cn(classes.summaryWrapper, { [classes.nestedSummaryWrapper]: isNested })}
        data-testid='summary-repeating-group-component'
      >
        <Heading
          data-size='xs'
          level={4}
        >
          <Lang id={title} />
        </Heading>
        <div className={cn(classes.contentWrapper, { [classes.nestedContentWrapper]: isNested })}>
          {rows.map((row, index) => {
            if (!row) {
              return null;
            }

            return (
              <RepGroupListRow
                key={row.uuid}
                row={row}
                targetBaseComponentId={targetBaseComponentId}
                visibleChildIds={visibleChildIds}
                dataModelBindings={dataModelBindings}
                showDivider={index !== 0}
              />
            );
          })}
        </div>
        {errors?.map(({ message }) => (
          <ValidationMessage
            key={message.key}
            className={classes.errorMessage}
          >
            <Lang
              id={message.key}
              params={message.params}
            />
          </ValidationMessage>
        ))}
      </div>
    </SummaryFlexForContainer>
  );
};

interface RepGroupListRowProps {
  row: RepGroupRow;
  targetBaseComponentId: string;
  visibleChildIds: string[];
  dataModelBindings: { group: IDataModelReference };
  showDivider: boolean;
}

function RepGroupListRow({
  row,
  targetBaseComponentId,
  visibleChildIds,
  dataModelBindings,
  showDivider,
}: RepGroupListRowProps) {
  const rowWithExpressions = RepGroupHooks.useRowWithExpressions(targetBaseComponentId, { uuid: row.uuid });
  const editableChildIds = RepGroupHooks.useEditableChildren(targetBaseComponentId, rowWithExpressions);

  return (
    <DataModelLocationProvider
      groupBinding={dataModelBindings.group}
      rowIndex={row.index}
    >
      <RepGroupSummaryEditableProvider editableChildIds={editableChildIds}>
        {showDivider && <hr className={classes.rowDivider} />}
        <Flex
          container
          spacing={6}
          alignItems='flex-start'
        >
          {visibleChildIds.map((baseId) => (
            <ComponentSummary
              key={baseId}
              targetBaseComponentId={baseId}
            />
          ))}
        </Flex>
      </RepGroupSummaryEditableProvider>
    </DataModelLocationProvider>
  );
}
