import React from 'react';

import { Heading, Table } from '@digdir/designsystemet-react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/List/ListComponent.module.css';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ListComponentSummaryProps = {
  isCompact?: boolean;
  componentNode: LayoutNode<'List'>;
  emptyFieldText?: string;
};
type Row = Record<string, string | number | boolean>;

export const ListSummary = ({ componentNode, isCompact, emptyFieldText }: ListComponentSummaryProps) => {
  const displayData = useDisplayData(componentNode);
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(
    componentNode,
    (i) => i.textResourceBindings?.summaryTitle || i.textResourceBindings?.title,
  );

  const { tableHeaders, dataModelBindings } = useNodeItem(componentNode);
  const { formData } = useDataModelBindings(dataModelBindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');

  const displayRows = (formData?.saveToList as Row[])?.map((row: Row) => {
    const { altinnRowId: _, ...rest } = row;
    return rest;
  });

  if (displayRows?.length > 0) {
    return (
      <div className={classes.listContainer}>
        <div className={classes.headerContainer}>
          <EditButton
            className={classes.editButton}
            componentNode={componentNode}
            summaryComponentId=''
          />
        </div>
        <Table>
          {title && (
            <caption className={classes.tableCaption}>
              <Heading
                size='xs'
                level={4}
              >
                <Lang
                  id={title}
                  node={componentNode}
                />
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
            {displayRows?.map((row, rowIndex) => {
              const rowItem = row;
              return (
                <Table.Row key={rowIndex}>
                  {Object.entries(tableHeaders).map(([key]) => (
                    <Table.Cell
                      key={key}
                      align='left'
                    >
                      {rowItem[key]}
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    );
  }

  return (
    <SingleValueSummary
      title={
        title && (
          <Lang
            id={title}
            node={componentNode}
          />
        )
      }
      displayData={displayData}
      errors={errors}
      componentNode={componentNode}
      isCompact={isCompact}
      emptyFieldText={emptyFieldText}
    />
  );
};
