import React, { useMemo } from 'react';
import type { JSX, PropsWithChildren } from 'react';

import { Heading, Table, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { LabelContent } from 'src/components/label/LabelContent';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { getComponentDef, implementsDisplayData } from 'src/layout';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Grid/GridSummary.module.css';
import { useIsGridRowHidden } from 'src/layout/Grid/tools';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import {
  EmptyChildrenBoundary,
  useHasOnlyEmptyChildren,
  useReportSummaryRender,
  useReportSummaryRenderToParent,
} from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import {
  ComponentSummary,
  HideWhenAllChildrenEmpty,
  SummaryContains,
  SummaryFlexForContainer,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import utilClasses from 'src/styles/utils.module.css';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type {
  GridCell,
  GridCellLabelFrom,
  GridCellText,
  GridComponentRef,
  GridRow,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const GridSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const indexedId = useIndexedId(targetBaseComponentId);
  const { rows, textResourceBindings } = useItemWhenType(targetBaseComponentId, 'Grid');
  const { title } = textResourceBindings ?? {};

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const isSmall = isMobile && !pdfModeActive;

  const tableSections: JSX.Element[] = [];
  let currentHeaderRow: GridRow | undefined = undefined;
  let currentBodyRows: GridRow[] = [];

  rows.forEach((row, index) => {
    if (row.header) {
      // If there are accumulated body rows, push them into a tbody
      if (currentBodyRows.length > 0) {
        tableSections.push(
          <Table.Body key={`tbody-${index}`}>
            {currentBodyRows.map((bodyRow, bodyIndex) => (
              <EmptyChildrenBoundary
                key={bodyIndex}
                reportSelf={false}
              >
                <SummaryGridRowRenderer
                  row={bodyRow}
                  mutableColumnSettings={columnSettings}
                  baseComponentId={targetBaseComponentId}
                />
              </EmptyChildrenBoundary>
            ))}
          </Table.Body>,
        );
        currentBodyRows = [];
      }
      // Add the header row
      tableSections.push(
        <Table.Head key={`thead-${index}`}>
          <EmptyChildrenBoundary
            key={index}
            reportSelf={false}
          >
            <SummaryGridRowRenderer
              row={row}
              mutableColumnSettings={columnSettings}
              baseComponentId={targetBaseComponentId}
              headerRow={currentHeaderRow}
            />
          </EmptyChildrenBoundary>
        </Table.Head>,
      );
      currentHeaderRow = row;
    } else {
      // Add to the current body rows
      currentBodyRows.push(row);
    }
  });

  // Push remaining body rows if any
  if (currentBodyRows.length > 0) {
    tableSections.push(
      <tbody key={`tbody-${rows.length}`}>
        {currentBodyRows.map((bodyRow, bodyIndex) => (
          <EmptyChildrenBoundary
            key={bodyIndex}
            reportSelf={false}
          >
            <SummaryGridRowRenderer
              row={bodyRow}
              mutableColumnSettings={columnSettings}
              baseComponentId={targetBaseComponentId}
              headerRow={currentHeaderRow}
            />
          </EmptyChildrenBoundary>
        ))}
      </tbody>,
    );
  }

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      <Table
        id={indexedId}
        className={cn(classes.table, { [classes.responsiveTable]: isSmall })}
        data-testid={`summary-${indexedId}`}
      >
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
        {tableSections}
      </Table>
    </SummaryFlexForContainer>
  );
};

interface GridRowProps {
  row: GridRow;
  mutableColumnSettings: ITableColumnFormatting;
  baseComponentId: string;
  headerRow?: GridRow;
}

function SummaryGridRowRenderer(props: GridRowProps) {
  const { row } = props;
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const firstComponentId = useFirstFormComponentId(row);

  const onlyEmptyChildren = useHasOnlyEmptyChildren();
  const isHeaderWithoutComponents = row.header === true && !row.cells.some((cell) => cell && 'component' in cell);
  const hideEmptyRows = useSummaryOverrides<'Grid'>(props.baseComponentId)?.hideEmptyRows;

  useReportSummaryRenderToParent(
    isHeaderWithoutComponents
      ? SummaryContains.Presentational
      : onlyEmptyChildren
        ? SummaryContains.EmptyValueNotRequired
        : SummaryContains.SomeUserContent,
  );

  const rowHidden = useIsGridRowHidden(row);
  if (rowHidden) {
    return null;
  }

  const extraClassName = row.readOnly ? classes.rowReadOnly : undefined;

  return (
    <HideWhenAllChildrenEmpty
      hideWhen={hideEmptyRows}
      render={(className) => (
        <Table.Row className={cn(className, extraClassName)}>
          {row.cells.filter(typedBoolean).map((cell, cellIdx) => (
            <SummaryCell
              key={cellIdx}
              cell={cell}
              idx={cellIdx}
              isSmall={isSmall}
              {...props}
            />
          ))}
          {!pdfModeActive && row.header && !isSmall && (
            <Table.HeaderCell>
              <span className={utilClasses.visuallyHidden}>
                <Lang id='general.edit' />
              </span>
            </Table.HeaderCell>
          )}
          {!pdfModeActive && !row.header && !isSmall && (
            <Table.Cell align='right'>
              {firstComponentId && !row.readOnly && <EditButton targetBaseComponentId={firstComponentId} />}
            </Table.Cell>
          )}
        </Table.Row>
      )}
    />
  );
}

function useFirstFormComponentId(row: GridRow): string | undefined {
  const layoutLookups = useLayoutLookups();
  const canRender = useHasCapability('renderInTable');
  return useMemo(() => {
    for (const cell of row.cells) {
      if (cell && 'component' in cell && cell.component && canRender(cell.component)) {
        const type = layoutLookups.getComponent(cell.component)?.type;
        const def = getComponentDef(type);
        if (def && def.category === CompCategory.Form) {
          return cell.component;
        }
      }
    }
    return undefined;
  }, [canRender, layoutLookups, row.cells]);
}

interface CellProps extends GridRowProps {
  cell: GridCell;
  idx: number;
  isSmall: boolean;
}

function SummaryCell(props: CellProps) {
  const cell = props.headerRow?.cells[props.idx];
  const referencedId = cell && 'labelFrom' in cell ? cell.labelFrom : undefined;
  const { langAsString } = useLanguage();

  if (referencedId) {
    return (
      <SummaryCellInnerWithLabel
        {...props}
        labelFrom={referencedId}
      />
    );
  }

  return (
    <SummaryCellInner
      {...props}
      headerTitle={cell && 'text' in cell ? langAsString(cell.text) : ''}
    />
  );
}

function SummaryCellInnerWithLabel(props: CellProps & { labelFrom: string }) {
  const { langAsString, langAsNonProcessedString } = useLanguage();
  const item = useItemFor(props.labelFrom);
  const required = 'required' in item ? item.required : false;
  const title =
    item.textResourceBindings && 'title' in item.textResourceBindings ? item.textResourceBindings.title : undefined;
  const requiredIndicator = required ? ` ${langAsNonProcessedString('form_filler.required_label')}` : '';
  const headerTitle = `${langAsString(title || '')}${requiredIndicator}`;

  return (
    <SummaryCellInner
      {...props}
      headerTitle={headerTitle}
    />
  );
}

function SummaryCellInner({
  cell,
  idx,
  headerTitle,
  mutableColumnSettings,
  row,
  isSmall,
}: CellProps & { headerTitle: string }) {
  if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
    mutableColumnSettings[idx] = cell.columnOptions;
  }

  const baseProps: Omit<BaseCellProps, 'columnStyleOptions'> = {
    rowReadOnly: row.readOnly,
    isHeader: row.header,
    isSmall,
  };

  if (cell && ('labelFrom' in cell || 'text' in cell)) {
    let textCellSettings: ITableColumnProperties = mutableColumnSettings[idx]
      ? structuredClone(mutableColumnSettings[idx])
      : {};
    textCellSettings = { ...textCellSettings, ...cell };

    if ('text' in cell && cell.text) {
      return (
        <SummaryCellWithText
          key={`${cell.text}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        >
          <Lang id={cell.text} />
        </SummaryCellWithText>
      );
    }

    if ('labelFrom' in cell && cell.labelFrom) {
      return (
        <SummaryCellWithLabel
          key={`${cell.labelFrom}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        />
      );
    }
  }

  if (cell && 'component' in cell) {
    return (
      <SummaryCellWithComponentNodeCheck
        key={`${cell.component}/${idx}`}
        cell={cell}
        columnStyleOptions={mutableColumnSettings[idx]}
        headerTitle={headerTitle}
        {...baseProps}
      />
    );
  }

  const CellComponent = row.header ? Table.HeaderCell : Table.Cell;
  return <CellComponent />;
}

interface BaseCellProps {
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
  headerTitle?: string;
  isSmall?: boolean;
}

interface CellWithComponentProps extends BaseCellProps {
  cell: GridComponentRef;
}

interface CellWithTextProps extends PropsWithChildren, BaseCellProps {
  cell: GridCellText;
}

interface CellWithLabelProps extends BaseCellProps {
  cell: GridCellLabelFrom;
}

function SummaryCellWithComponentNodeCheck(props: CellWithComponentProps) {
  const canRender = useHasCapability('renderInTable');
  if (!props.cell.component || !canRender(props.cell.component)) {
    return <Table.Cell />;
  }

  return (
    <SummaryCellWithComponent
      {...props}
      baseComponentId={props.cell.component}
    />
  );
}

function SummaryCellWithComponent({
  baseComponentId,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
  headerTitle,
  isSmall,
}: CellWithComponentProps & { baseComponentId: string }) {
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const displayData = useDisplayData(baseComponentId);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const isHidden = useIsHidden(baseComponentId);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const item = useItemFor(baseComponentId);
  const textResourceBindings = item.textResourceBindings;
  const required = 'required' in item ? item.required : false;
  const indexedId = useIndexedId(baseComponentId);
  const content = getComponentCellData(baseComponentId, item.type, displayData, textResourceBindings);

  const isEmpty = typeof content === 'string' && content.trim() === '';
  useReportSummaryRender(
    isEmpty
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  if (isHidden) {
    return <CellComponent />;
  }

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
      data-is-empty={isEmpty ? 'yes' : 'no'}
      data-cell-node={indexedId}
    >
      <div className={cn(classes.contentWrapper, { [classes.validationError]: errors.length > 0 })}>
        {content}
        {isSmall && !rowReadOnly && (
          <EditButton
            className={classes.mobileEditButton}
            targetBaseComponentId={baseComponentId}
          />
        )}
      </div>
      <div className={cn({ [classes.errorMessage]: errors.length > 0 })} />
      {errors.length > 0 &&
        errors.map(({ message }) => (
          <ValidationMessage
            key={message.key}
            data-size='sm'
          >
            <Lang
              id={message.key}
              params={message.params}
            />
          </ValidationMessage>
        ))}
    </CellComponent>
  );
}

function SummaryCellWithText({
  children,
  columnStyleOptions,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      <span
        className={classes.contentFormatting}
        style={columnStyles}
      >
        {children}
      </span>
    </CellComponent>
  );
}

function SummaryCellWithLabel({
  cell,
  columnStyleOptions,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithLabelProps) {
  const refItem = useItemFor(cell.labelFrom);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const required = (refItem && 'required' in refItem && refItem.required) ?? false;

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      <LabelContent
        id={useIndexedId(cell.labelFrom)}
        label={title}
        required={required}
      />
    </CellComponent>
  );
}

function getComponentCellData<T extends CompTypes>(
  baseComponentId: string,
  type: T,
  displayData: string,
  textResourceBindings?: ITextResourceBindings,
) {
  if (type === 'Custom') {
    return <ComponentSummary targetBaseComponentId={baseComponentId} />;
  } else if (implementsDisplayData(getComponentDef(type))) {
    return displayData || '';
  } else if (textResourceBindings && 'title' in textResourceBindings) {
    return <Lang id={textResourceBindings.title} />;
  } else {
    return (
      <GenericComponent
        baseComponentId={baseComponentId}
        overrideDisplay={{
          renderLabel: false,
          renderLegend: false,
          renderedInTable: true,
        }}
      />
    );
  }
}
