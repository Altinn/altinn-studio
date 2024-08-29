import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import { ErrorMessage, Paragraph, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { LabelContent } from 'src/components/label/LabelContent';
import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { CompCategory } from 'src/layout/common';
import classes from 'src/layout/Grid/GridSummary.module.css';
import { isGridRowHidden } from 'src/layout/Grid/tools';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type {
  GridCellLabelFrom,
  GridCellText,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { GridCellInternal, GridCellNode, GridRowInternal } from 'src/layout/Grid/types';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type GridSummaryProps = Readonly<{
  componentNode: LayoutNode<'Grid'>;
}>;

export const GridSummary = ({ componentNode }: GridSummaryProps) => {
  const { rowsInternal, textResourceBindings } = useNodeItem(componentNode);
  const { title } = textResourceBindings ?? {};

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();

  const isSmall = isMobile && !pdfModeActive;

  const tableSections: JSX.Element[] = [];
  let currentHeaderRow: GridRowInternal | undefined = undefined;
  let currentBodyRows: GridRowInternal[] = [];

  rowsInternal.forEach((row, index) => {
    if (row.header) {
      // If there are accumulated body rows, push them into a tbody
      if (currentBodyRows.length > 0) {
        tableSections.push(
          <Table.Body key={`tbody-${index}`}>
            {currentBodyRows.map((bodyRow, bodyIndex) => (
              <GridRowRenderer
                key={bodyIndex}
                row={bodyRow}
                mutableColumnSettings={columnSettings}
                node={componentNode}
              />
            ))}
          </Table.Body>,
        );
        currentBodyRows = [];
      }
      // Add the header row
      tableSections.push(
        <Table.Head key={`thead-${index}`}>
          <GridRowRenderer
            key={index}
            row={row}
            mutableColumnSettings={columnSettings}
            node={componentNode}
            headerRow={currentHeaderRow}
          />
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
      <tbody key={`tbody-${rowsInternal.length}`}>
        {currentBodyRows.map((bodyRow, bodyIndex) => (
          <GridRowRenderer
            key={bodyIndex}
            row={bodyRow}
            mutableColumnSettings={columnSettings}
            node={componentNode}
            headerRow={currentHeaderRow}
          />
        ))}
      </tbody>,
    );
  }

  return (
    <Table
      id={componentNode.id}
      className={cn(classes.table, { [classes.responsiveTable]: isSmall })}
    >
      {title && (
        <caption className={classes.tableCaption}>
          <Paragraph
            className={classes.gridSummaryTitle}
            size='large'
            asChild
          >
            <span>
              <Lang id={title} />
            </span>
          </Paragraph>
        </caption>
      )}
      {tableSections}
    </Table>
  );
};

interface GridRowProps {
  row: GridRowInternal;
  mutableColumnSettings: ITableColumnFormatting;
  node: LayoutNode;
  headerRow?: GridRowInternal;
}

export function GridRowRenderer(props: GridRowProps) {
  const { row } = props;
  const isMobile = useIsMobile();
  const isHiddenSelector = Hidden.useIsHiddenSelector();

  const pdfModeActive = usePdfModeActive();

  const isSmall = isMobile && !pdfModeActive;

  const firstComponentCell = row.cells.find((cell) => cell && 'node' in cell);
  const firstComponentNode =
    firstComponentCell &&
    'node' in firstComponentCell &&
    firstComponentCell.node.isCategory(CompCategory.Form) &&
    firstComponentCell.node;

  if (isGridRowHidden(row, isHiddenSelector)) {
    return null;
  }

  return (
    <InternalRow readOnly={row.readOnly}>
      {row.cells.filter(typedBoolean).map((cell, cellIdx) => (
        <Cell
          key={cellIdx}
          cell={cell}
          idx={cellIdx}
          isSmall={isSmall}
          {...props}
        />
      ))}
      {!pdfModeActive && row.header && !isSmall && <Table.HeaderCell />}
      {!pdfModeActive && !row.header && !isSmall && (
        <Table.Cell align='right'>
          {firstComponentNode && !row.readOnly && (
            <EditButton
              componentNode={firstComponentNode}
              summaryComponentId=''
            />
          )}
        </Table.Cell>
      )}
    </InternalRow>
  );
}

type InternalRowProps = PropsWithChildren<Pick<GridRowInternal, 'header' | 'readOnly'>>;

function InternalRow({ header, readOnly, children }: InternalRowProps) {
  const className = readOnly ? classes.rowReadOnly : undefined;

  if (header) {
    return <Table.Row className={className}>{children}</Table.Row>;
  }

  return <Table.Row className={className}>{children}</Table.Row>;
}

function useHeaderText(headerRow: GridRowInternal | undefined, cellIdx: number) {
  const { langAsString, langAsNonProcessedString } = useLanguage();
  const cell = headerRow?.cells[cellIdx] ?? undefined;
  const referencedNode = useNode(cell && 'labelFrom' in cell ? cell.labelFrom : undefined);
  const referencedNodeIsRequired = useNodeItem(referencedNode, (i) => ('required' in i ? i.required : false));
  const referencedNodeTitle = useNodeItem(referencedNode, (i) =>
    i.textResourceBindings && 'title' in i.textResourceBindings ? i.textResourceBindings.title : undefined,
  );
  const requiredIndicator = referencedNodeIsRequired
    ? ` ${langAsNonProcessedString('form_filler.required_label')}`
    : '';

  let headerText = '';
  if (cell && 'text' in cell) {
    headerText = cell.text;
  } else if (cell && 'labelFrom' in cell) {
    headerText = referencedNodeTitle ? referencedNodeTitle : '';
  }

  return `${langAsString(headerText)}${requiredIndicator}`;
}

interface CellProps extends GridRowProps {
  cell: GridCellInternal;
  idx: number;
  isSmall: boolean;
}

function Cell({ cell, idx: idx, headerRow, mutableColumnSettings, row, node, isSmall }: CellProps) {
  const headerTitle = useHeaderText(headerRow, idx);
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
        <CellWithText
          key={`${cell.text}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        >
          <Lang
            id={cell.text}
            node={node}
          />
        </CellWithText>
      );
    }

    if ('labelFrom' in cell && cell.labelFrom) {
      return (
        <CellWithLabel
          key={`${cell.labelFrom}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        />
      );
    }
  }

  if (cell && 'node' in cell) {
    return (
      <CellWithComponent
        key={`${cell.node.id}/${idx}`}
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
  cell: GridCellNode;
}

interface CellWithTextProps extends PropsWithChildren, BaseCellProps {
  cell: GridCellText;
}

interface CellWithLabelProps extends BaseCellProps {
  cell: GridCellLabelFrom;
}

function CellWithComponent({
  cell,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
  headerTitle,
  isSmall,
}: CellWithComponentProps) {
  const node = cell.node;
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const displayDataProps = useDisplayDataProps();
  const validations = useUnifiedValidationsForNode(node);
  const errors = validationsOfSeverity(validations, 'error');
  const isHidden = Hidden.useIsHidden(node);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);

  if (isHidden) {
    return <CellComponent />;
  }

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      <div className={cn(classes.contentWrapper, { [classes.validationError]: errors.length > 0 })}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {('getDisplayData' in node.def && node.def.getDisplayData(node as LayoutNode<any>, displayDataProps)) || '-'}
        {isSmall && !rowReadOnly && (
          <EditButton
            className={classes.mobileEditButton}
            componentNode={node}
            summaryComponentId=''
          />
        )}
      </div>
      <div className={cn({ [classes.errorMessage]: errors.length > 0 })}></div>
      {errors.length > 0 &&
        errors.map(({ message }) => (
          <ErrorMessage key={message.key}>
            <Lang
              id={message.key}
              params={message.params}
              node={node}
            ></Lang>
          </ErrorMessage>
        ))}
    </CellComponent>
  );
}

function CellWithText({ children, columnStyleOptions, isHeader = false, headerTitle, isSmall }: CellWithTextProps) {
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

function CellWithLabel({ cell, columnStyleOptions, isHeader = false, headerTitle, isSmall }: CellWithLabelProps) {
  const referenceComponent = useNode(cell.labelFrom);
  const refItem = useNodeItem(referenceComponent);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const required = (referenceComponent && 'required' in refItem && refItem.required) ?? false;
  const componentId = refItem.id ?? refItem.baseComponentId;

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      {componentId && (
        <LabelContent
          labelId={`label-${componentId}`}
          label={title}
          required={required}
        />
      )}
    </CellComponent>
  );
}
