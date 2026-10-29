import React from 'react';

import { useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Table } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { GridCell, ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';

import { Caption } from 'src/components/form/caption/Caption';
import { LabelContent } from 'src/components/label/LabelContent';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { ValidationMessageList } from 'src/features/validation/ValidationMessageList';
import repeatingGroupClasses from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import tableClasses from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary.module.css';
import { RepeatingGroupTableTitle, useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { EditButtonFirstVisibleAndEditable } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import {
  useSummaryCaptionProps,
  useSummaryLabelProps,
} from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
import { useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummary, SummaryContains } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import utilClasses from 'src/styles/utils.module.css';
import { getColumnStyles, useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentIsRequired } from 'src/utils/layout/useComponentIsRequired';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { GridRowLayout } from 'src/layout/Grid/useGridRows';
import type { BaseRow } from 'src/utils/layout/types';

export const RepeatingGroupTableSummary = ({ baseComponentId }: { baseComponentId: string }) => {
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const rows = RepGroupHooks.useVisibleRows(baseComponentId);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup');
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.RepeatingGroup.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.RepeatingGroup.textResourceBindings.title,
  );

  const title = summaryTitle || resolvedTitle;
  const captionProps = useSummaryCaptionProps(baseComponentId, title);
  const { columns, hiddenColumns, columnSettings, rowsBefore, rowsAfter } = RepGroupHooks.useTableLayout(
    baseComponentId,
    'summary',
  );
  const showEditColumn = !pdfModeActive && !isSmall;
  return (
    <div
      className={cn(classes.summaryWrapper)}
      data-testid='summary-repeating-group-component'
    >
      <Table className={cn({ [tableClasses.mobileTable]: isSmall })}>
        <Caption
          {...captionProps}
          title={<Lang id={title} />}
        />
        <Table.Body>
          {renderExtraRows(rowsBefore, 'before', showEditColumn)}
          <Table.Row>
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={0} // Force the header row to show texts as if it is in the first row
            >
              {columns.map((id) => (
                <HeaderCell
                  key={id}
                  baseComponentId={id}
                  columnSettings={columnSettings}
                />
              ))}
            </DataModelLocationProvider>
            {showEditColumn && (
              <Table.HeaderCell className={tableClasses.narrowLastColumn}>
                <span className={utilClasses.visuallyHidden}>
                  <Lang id='general.edit' />
                </span>
              </Table.HeaderCell>
            )}
          </Table.Row>
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
                columns={columns}
                hiddenColumns={hiddenColumns}
              />
            </DataModelLocationProvider>
          ))}
          {renderExtraRows(rowsAfter, 'after', showEditColumn)}
        </Table.Body>
      </Table>
      <ValidationMessageList
        validations={errors}
        size='sm'
        className={classes.errorMessage}
        icon={<ExclamationmarkTriangleIcon fontSize='1.5rem' />}
      />
    </div>
  );
};

function renderExtraRows(rows: GridRowLayout[], keyPrefix: 'before' | 'after', showEditColumn: boolean) {
  return rows.map((row, rowIdx) => {
    const cells = row.cells.map(({ cell, colSpan }, cellIdx) => (
      <ExtraRowCell
        key={cellIdx}
        cell={cell}
        isHeader={!!row.header}
        colSpan={colSpan}
      />
    ));
    return (
      <Table.Row key={`row-${keyPrefix}-${rowIdx}`}>
        {cells}
        {showEditColumn &&
          (row.header ? (
            <Table.HeaderCell className={tableClasses.narrowLastColumn} />
          ) : (
            <Table.Cell className={tableClasses.narrowLastColumn} />
          ))}
      </Table.Row>
    );
  });
}

function ExtraRowCell({ cell, isHeader, colSpan }: { cell: GridCell; isHeader: boolean; colSpan: number }) {
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const columnStyles = cell ? getColumnStyles(cell) : undefined;

  return (
    <CellComponent
      colSpan={colSpan > 1 ? colSpan : undefined}
      style={columnStyles}
    >
      {cell && 'text' in cell && cell.text !== undefined && (
        <span className={tableClasses.cellValue}>
          <Lang id={cell.text} />
        </span>
      )}
      {cell && 'component' in cell && cell.component && <ComponentSummary targetBaseComponentId={cell.component} />}
    </CellComponent>
  );
}

function HeaderCell({
  baseComponentId,
  columnSettings,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const title = useTableTitle(baseComponentId);
  const labelProps = useSummaryLabelProps(baseComponentId);

  return (
    <Table.HeaderCell
      className={repeatingGroupClasses.tableCellFormatting}
      style={style}
    >
      <LabelContent
        {...labelProps}
        label={
          <RepeatingGroupTableTitle
            baseComponentId={baseComponentId}
            columnSettings={columnSettings}
          />
        }
        helpTitle={title}
      />
    </Table.HeaderCell>
  );
}

type DataRowProps = {
  row: BaseRow | undefined;
  columns: string[];
  hiddenColumns: string[];
  baseComponentId: string;
  pdfModeActive: boolean;
  columnSettings: ITableColumnFormatting;
};

function DataRow({ row, baseComponentId, pdfModeActive, columnSettings, columns, hiddenColumns }: DataRowProps) {
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const children = RepGroupHooks.useChildIds(baseComponentId);
  const ids = useTableComponentIds(baseComponentId);
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const editButton = useEvalExpression(config.edit?.editButton, Expressions.RepeatingGroup.edit.editButton);
  const editableChildren = RepGroupHooks.useEditableChildCandidates(baseComponentId, editButton, hiddenColumns);
  const editableIds = [...ids, ...children].filter((id) => editableChildren.includes(id));
  const rowErrors = useDeepValidationsForNode(baseComponentId, false, row?.index, true).filter(
    (validation) => validation.severity === 'error',
  );
  const visibleIdSet = new Set(columns);
  const errorsByColumnId: Record<string, typeof rowErrors> = {};
  const unmappedRowErrors: typeof rowErrors = [];
  for (const validation of rowErrors) {
    const key = validation.baseComponentId;
    if (!key || !visibleIdSet.has(key)) {
      unmappedRowErrors.push(validation);
      continue;
    }
    errorsByColumnId[key] = errorsByColumnId[key] ?? [];
    errorsByColumnId[key].push(validation);
  }

  if (!row) {
    return null;
  }

  return (
    <Table.Row>
      {columns.map((id) =>
        layoutLookups.getComponent(id).type === 'Custom' ? (
          <Table.Cell key={id}>
            <ComponentSummary targetBaseComponentId={id} />
          </Table.Cell>
        ) : (
          <DataCell
            key={id}
            baseComponentId={id}
            columnSettings={columnSettings}
            errors={errorsByColumnId[id] ?? (id === columns[0] ? unmappedRowErrors : [])}
          />
        ),
      )}
      {!pdfModeActive && (
        <Table.Cell
          align='right'
          className={tableClasses.buttonCell}
        >
          <EditButtonFirstVisibleAndEditable
            key={editableIds.join(',')}
            ids={editableIds}
            fallback={editButton !== false ? baseComponentId : undefined}
          />
        </Table.Cell>
      )}
    </Table.Row>
  );
}

type DataCellProps = {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
  errors: ReturnType<typeof useDeepValidationsForNode>;
};

function DataCell(props: DataCellProps) {
  const hidden = useIsHidden(props.baseComponentId);
  return hidden ? <HiddenDataCell /> : <VisibleDataCell {...props} />;
}

function HiddenDataCell() {
  useReportSummaryRender(SummaryContains.EmptyValueNotRequired);
  return <Table.Cell />;
}

function VisibleDataCell({ baseComponentId, columnSettings, errors }: DataCellProps) {
  const { langAsString } = useLanguage();
  const headerTitle = langAsString(useTableTitle(baseComponentId));
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const displayData = useDisplayData(baseComponentId);
  const config = useComponentConfig(baseComponentId);

  const required = useComponentIsRequired(config);

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <Table.Cell
      data-header-title={headerTitle}
      className={cn(tableClasses.dataCell, repeatingGroupClasses.tableCellFormatting)}
    >
      <span
        className={cn(
          repeatingGroupClasses.contentFormatting,
          repeatingGroupClasses.cellContentFormatting,
          tableClasses.cellValue,
        )}
        style={style}
      >
        {displayData}
      </span>
      <ValidationMessageList
        validations={errors}
        size='sm'
        className={cn(classes.errorMessage, tableClasses.cellValidationMessage)}
      />
    </Table.Cell>
  );
}
