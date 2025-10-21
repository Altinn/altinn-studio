import React from 'react';

import { Table, ValidationMessage } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import repeatingGroupClasses from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import tableClasses from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary.module.css';
import { RepeatingGroupTableTitle, useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { EditButtonFirstVisible } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummary, SummaryContains } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import utilClasses from 'src/styles/utils.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { BaseRow } from 'src/utils/layout/types';

export const RepeatingGroupTableSummary = ({ baseComponentId }: { baseComponentId: string }) => {
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const rows = RepGroupHooks.useVisibleRows(baseComponentId);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const { textResourceBindings, dataModelBindings, tableColumns } = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const title = textResourceBindings?.title;
  const tableIds = useTableComponentIds(baseComponentId);
  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);

  return (
    <div
      className={cn(classes.summaryWrapper)}
      data-testid='summary-repeating-group-component'
    >
      <Table className={cn({ [tableClasses.mobileTable]: isSmall })}>
        <Caption title={<Lang id={title} />} />
        <Table.Head>
          <Table.Row>
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={0} // Force the header row to show texts as if it is in the first row
            >
              {tableIds.map((id) => (
                <HeaderCell
                  key={id}
                  baseComponentId={id}
                  columnSettings={columnSettings}
                />
              ))}
            </DataModelLocationProvider>
            {!pdfModeActive && !isSmall && (
              <Table.HeaderCell className={tableClasses.narrowLastColumn}>
                <span className={utilClasses.visuallyHidden}>
                  <Lang id='general.edit' />
                </span>
              </Table.HeaderCell>
            )}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row, index) => (
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={row?.index ?? index}
              key={`${row?.uuid}-${index}`}
            >
              <DataRow
                row={row}
                baseComponentId={baseComponentId}
                pdfModeActive={pdfModeActive}
                columnSettings={columnSettings}
              />
            </DataModelLocationProvider>
          ))}
        </Table.Body>
      </Table>
      {errors?.map(({ message }) => (
        <ValidationMessage
          key={message.key}
          data-size='sm'
          className={classes.errorMessage}
        >
          <ExclamationmarkTriangleIcon fontSize='1.5rem' />
          <Lang
            id={message.key}
            params={message.params}
          />
        </ValidationMessage>
      ))}
    </div>
  );
};

function HeaderCell({
  baseComponentId,
  columnSettings,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  return (
    <Table.HeaderCell style={style}>
      <RepeatingGroupTableTitle
        baseComponentId={baseComponentId}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}

type DataRowProps = {
  row: BaseRow | undefined;
  baseComponentId: string;
  pdfModeActive: boolean;
  columnSettings: ITableColumnFormatting;
};

function DataRow({ row, baseComponentId, pdfModeActive, columnSettings }: DataRowProps) {
  const layoutLookups = useLayoutLookups();
  const ids = useTableComponentIds(baseComponentId);
  const children = RepGroupHooks.useChildIds(baseComponentId);

  if (!row) {
    return null;
  }

  return (
    <Table.Row>
      {ids.map((id) =>
        layoutLookups.getComponent(id).type === 'Custom' ? (
          <Table.Cell key={id}>
            <ComponentSummary targetBaseComponentId={id} />
          </Table.Cell>
        ) : (
          <DataCell
            key={id}
            baseComponentId={id}
            columnSettings={columnSettings}
          />
        ),
      )}
      {!pdfModeActive && (
        <Table.Cell
          align='right'
          className={tableClasses.buttonCell}
        >
          <EditButtonFirstVisible
            ids={[...ids, ...children]}
            fallback={baseComponentId}
          />
        </Table.Cell>
      )}
    </Table.Row>
  );
}

type DataCellProps = {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
};

function DataCell({ baseComponentId, columnSettings }: DataCellProps) {
  const { langAsString } = useLanguage();
  const headerTitle = langAsString(useTableTitle(baseComponentId));
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const displayData = useDisplayData(baseComponentId);
  const item = useItemFor(baseComponentId);
  const required = 'required' in item ? item.required : false;

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <Table.Cell data-header-title={headerTitle}>
      <span
        className={repeatingGroupClasses.contentFormatting}
        style={style}
      >
        {displayData}
      </span>
    </Table.Cell>
  );
}
