import React from 'react';
import type { PropsWithChildren } from 'react';

import { ErrorMessage, Paragraph, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Label } from 'src/components/form/Label';
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
import type {
  GridCellInternal,
  GridRowInternal,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

type GridSummaryProps = {
  componentNode: LayoutNode<'Grid'>;
};

export const GridSummary = ({ componentNode }: GridSummaryProps) => {
  const { rows, textResourceBindings } = componentNode.item;
  const { title } = textResourceBindings ?? {};

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();

  const isSmall = isMobile && !pdfModeActive;

  const tableSections: JSX.Element[] = [];
  let currentHeaderRow: GridRowInternal | undefined = undefined;
  let currentBodyRows: GridRowInternal[] = [];

  rows.forEach((row, index) => {
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
            currentHeaderCells={currentHeaderRow?.cells}
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
      <tbody key={`tbody-${rows.length}`}>
        {currentBodyRows.map((bodyRow, bodyIndex) => (
          <GridRowRenderer
            key={bodyIndex}
            row={bodyRow}
            mutableColumnSettings={columnSettings}
            node={componentNode}
            currentHeaderCells={currentHeaderRow?.cells}
          />
        ))}
      </tbody>,
    );
  }

  return (
    <Table
      id={componentNode.item.id}
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
  currentHeaderCells?: GridCellInternal[];
}

const getCurrentHeaderCell = (currentHeaderCells: GridCellInternal[], index: number): GridCellInternal | undefined =>
  currentHeaderCells[index] ?? undefined;

const getHeaderText = (cell: GridCellInternal | undefined, referencedNode) => {
  if (!cell) {
    return '';
  }

  if ('text' in cell) {
    return cell.text;
  }

  if ('labelFrom' in cell) {
    return referencedNode?.item.textResourceBindings && 'title' in referencedNode.item.textResourceBindings
      ? referencedNode?.item.textResourceBindings?.title
      : '';
  }

  return '';
};

export function GridRowRenderer({ row, mutableColumnSettings, node, currentHeaderCells }: GridRowProps) {
  const { langAsString, langAsNonProcessedString } = useLanguage();
  const isMobile = useIsMobile();

  const pdfModeActive = usePdfModeActive();

  const isSmall = isMobile && !pdfModeActive;

  const firstComponentCell = row.cells.find((cell) => cell && 'node' in cell);
  const firstComponentNode =
    firstComponentCell &&
    'node' in firstComponentCell &&
    firstComponentCell.node.isCategory(CompCategory.Form) &&
    firstComponentCell.node;

  return isGridRowHidden(row) ? null : (
    <InternalRow
      header={row.header}
      readOnly={row.readOnly}
    >
      {row.cells.map((cell, cellIdx) => {
        const currentHeaderCell = getCurrentHeaderCell(currentHeaderCells ?? [], cellIdx);
        let referencedNode: BaseLayoutNode | undefined = undefined;
        let referencedNodeIsRequired = false;
        if (currentHeaderCell && 'labelFrom' in currentHeaderCell) {
          const referencedComponent = node
            .flat(true)
            .find(
              (n) =>
                n.item.id === currentHeaderCell.labelFrom || n.item.baseComponentId === currentHeaderCell.labelFrom,
            );
          if (referencedComponent) {
            referencedNode = referencedComponent;
            referencedNodeIsRequired =
              ('required' in referencedComponent.item && referencedComponent.item.required) ?? false;
          }
        }
        const requiredIndicator = referencedNodeIsRequired
          ? ` ${langAsNonProcessedString('form_filler.required_label')}`
          : '';
        const headerTitle = `${langAsString(getHeaderText(currentHeaderCell, referencedNode))}${requiredIndicator}`;

        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (cell && ('labelFrom' in cell || 'text' in cell)) {
          let textCellSettings: ITableColumnProperties = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};
          textCellSettings = { ...textCellSettings, ...cell };

          if ('text' in cell && cell.text) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                help={cell?.help}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
                headerTitle={headerTitle}
                isSmall={isSmall}
              >
                <Lang
                  id={cell.text}
                  node={node}
                />
              </CellWithText>
            );
          }

          if ('labelFrom' in cell && cell.labelFrom) {
            const closestComponent = node
              .flat(true)
              .find((n) => n.item.id === cell.labelFrom || n.item.baseComponentId === cell.labelFrom);

            return (
              <CellWithLabel
                key={`${cell.labelFrom}/${cellIdx}`}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
                referenceComponent={closestComponent}
                headerTitle={headerTitle}
                isSmall={isSmall}
              />
            );
          }
        }
        const componentNode = cell && 'node' in cell ? cell.node : undefined;
        const componentId = componentNode && componentNode.item.id;

        return (
          <CellWithComponent
            rowReadOnly={row.readOnly}
            key={`${componentId}/${cellIdx}`}
            node={componentNode}
            isHeader={row.header}
            columnStyleOptions={mutableColumnSettings[cellIdx]}
            headerTitle={headerTitle}
            isSmall={isSmall}
          />
        );
      })}
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

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
  headerTitle?: string;
  isSmall?: boolean;
}

interface CellWithComponentProps extends CellProps {
  node?: LayoutNode;
}

interface CellWithTextProps extends PropsWithChildren, CellProps {
  help?: string;
}

interface CellWithLabelProps extends CellProps {
  referenceComponent?: LayoutNode;
}

function CellWithComponent({
  node,
  className,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
  headerTitle,
  isSmall,
}: CellWithComponentProps) {
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const displayDataProps = useDisplayDataProps();
  const validations = useUnifiedValidationsForNode(node);
  const errors = validationsOfSeverity(validations, 'error');
  if (node && !node.isHidden()) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(classes.tableCellFormatting, className)}
        style={columnStyles}
        data-header-title={isSmall ? headerTitle : ''}
      >
        <div className={cn(classes.contentWrapper, { [classes.validationError]: errors.length > 0 })}>
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

  return <CellComponent className={className} />;
}

function CellWithText({
  children,
  className,
  columnStyleOptions,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(classes.tableCellFormatting, className)}
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

function CellWithLabel({
  className,
  columnStyleOptions,
  referenceComponent,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const refItem = referenceComponent?.item;
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const required =
    (referenceComponent && 'required' in referenceComponent.item && referenceComponent.item.required) ?? false;
  const componentId = referenceComponent?.item.id ?? referenceComponent?.item.baseComponentId;

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(classes.tableCellFormatting, className)}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      {componentId && (
        <span className={classes.textLabel}>
          <Label
            key={`label-${componentId}`}
            label={<Lang id={title} />}
            id={componentId}
            required={required}
          />
        </span>
      )}
    </CellComponent>
  );
}
