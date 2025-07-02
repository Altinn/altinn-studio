import React from 'react';

import { Heading, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import { RepeatingGroupTableSummary } from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import {
  ComponentSummaryById,
  SummaryContains,
  SummaryFlex,
  SummaryFlexForContainer,
  useSummarySoftHidden,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const RepeatingGroupSummary = ({ target }: Summary2Props<'RepeatingGroup'>) => {
  const componentNode = target;
  const overrides = useSummaryOverrides(componentNode);
  const display = overrides?.display ?? 'list';
  const isCompact = useSummaryProp('isCompact');
  const childIds = RepGroupHooks.useChildIds(target.baseId);
  const rows = RepGroupHooks.useVisibleRows(target.baseId);
  const validations = useUnifiedValidationsForNode(componentNode.baseId);
  const errors = validationsOfSeverity(validations, 'error');
  const { textResourceBindings, dataModelBindings, minCount } = useItemWhenType(componentNode.baseId, 'RepeatingGroup');
  const title = textResourceBindings?.title;
  const parent = useLayoutLookups().componentToParent[componentNode.baseId];
  const isNested = parent?.type === 'node';
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const required = minCount !== undefined && minCount > 0;
  const { className } = useSummarySoftHidden(hideEmptyFields && rows.length === 0 && !required);

  if (rows.length === 0) {
    return (
      <SummaryFlex
        target={target}
        content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
        className={className}
      >
        <SingleValueSummary
          title={<Lang id={title} />}
          componentNode={componentNode}
          errors={errors}
          isCompact={isCompact}
          emptyFieldText={overrides?.emptyFieldText}
        />
      </SummaryFlex>
    );
  }

  if (display === 'table' && componentNode) {
    return (
      <SummaryFlexForContainer
        hideWhen={hideEmptyFields}
        target={target}
      >
        <RepeatingGroupTableSummary componentNode={componentNode} />
      </SummaryFlexForContainer>
    );
  }

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
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
          {rows.map((row) => {
            if (!row) {
              return null;
            }

            return (
              <DataModelLocationProvider
                key={row?.uuid}
                groupBinding={dataModelBindings.group}
                rowIndex={row.index}
              >
                {row.index != 0 && <hr className={classes.rowDivider} />}
                <Flex
                  key={row?.uuid}
                  container
                  spacing={6}
                  alignItems='flex-start'
                >
                  {childIds.map((nodeId) => (
                    <ComponentSummaryById
                      key={`${nodeId}-${row.index}`}
                      componentId={`${nodeId}-${row.index}`}
                    />
                  ))}
                </Flex>
              </DataModelLocationProvider>
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
