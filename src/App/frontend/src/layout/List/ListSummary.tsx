import React from 'react';

import { Heading, Table } from '@digdir/designsystemet-react';
import dot from 'dot-object';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/List/ListComponent.module.css';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Row = Record<string, string | number | boolean>;

export const ListSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'List'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');

  const { tableHeaders, dataModelBindings, required, textResourceBindings } = useItemWhenType(
    targetBaseComponentId,
    'List',
  );
  const title = textResourceBindings?.summaryTitle || textResourceBindings?.title;
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
          <Table>
            {title && (
              <caption className={classes.tableCaption}>
                <Heading
                  data-size='xs'
                  level={4}
                >
                  <Lang id={title} />
                </Heading>
              </caption>
            )}
            <Table.Head>
              <Table.Row>
                {Object.entries(tableHeaders).map(([key, value]) => (
                  <Table.HeaderCell key={key}>
                    <Lang id={value} />
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {displayRows?.map((row, rowIndex) => (
                <Table.Row key={rowIndex}>
                  {Object.entries(tableHeaders).map(([key]) => {
                    const binding = dataModelBindings?.[key];
                    if (!binding || !dataModelBindings?.group) {
                      return null;
                    }

                    const relativePath = binding?.field.replace(`${dataModelBindings.group.field}.`, '');
                    const data = dot.pick(relativePath, row);
                    return (
                      <Table.Cell
                        key={key}
                        align='left'
                      >
                        {data}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
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
        title={title && <Lang id={title} />}
        displayData={displayData}
        errors={errors}
        targetBaseComponentId={targetBaseComponentId}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
