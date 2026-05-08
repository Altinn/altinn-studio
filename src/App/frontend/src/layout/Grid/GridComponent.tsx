import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Caption } from 'src/components/form/caption/Caption';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { LabelContent } from 'src/components/label/LabelContent';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import {
  getGridCellHiddenExpr,
  isGridCellLabelFrom,
  isGridCellNode,
  isGridCellText,
  useBaseIdsFromGrid,
  useIsGridRowHidden,
} from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type {
  GridCell,
  GridRow,
  IGridColumnProperties,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';

interface ColSpanHiddenOverlapWarningParams {
  colSpan: number;
  cellIdx: number;
  hiddenColumnIndices?: number[];
  cellDescription: string;
}

function warnForColSpanHiddenOverlap({
  colSpan,
  cellIdx,
  hiddenColumnIndices,
  cellDescription,
}: ColSpanHiddenOverlapWarningParams): void {
  const normalizedHiddenColumnIndices = hiddenColumnIndices ?? [];
  if (colSpan <= 1 || cellIdx < 0 || normalizedHiddenColumnIndices.length === 0) {
    return;
  }

  const overlappingHiddenColumns = normalizedHiddenColumnIndices.filter(
    (hiddenIdx) => hiddenIdx > cellIdx && hiddenIdx < cellIdx + colSpan,
  );
  if (overlappingHiddenColumns.length === 0) {
    return;
  }

  const warningMessage =
    `Grid: colSpan overlaps hidden column(s). Cell ${cellDescription} at index ${cellIdx} has colSpan=${colSpan}, ` +
    `overlapping hidden column indices [${overlappingHiddenColumns.join(', ')}]. This may cause unexpected layout.`;

  if (process.env.NODE_ENV !== 'production') {
    console.warn(warningMessage);
  }

  if (window.logWarnOnce) {
    window.logWarnOnce(warningMessage);
    return;
  }

  window.logWarn?.(warningMessage);
}

function useWarnIfColSpanOverlapsHiddenColumns({
  colSpan,
  cellIdx,
  hiddenColumnIndices = [],
  cellDescription,
}: ColSpanHiddenOverlapWarningParams) {
  useEffect(() => {
    warnForColSpanHiddenOverlap({ colSpan, cellIdx, hiddenColumnIndices, cellDescription });
  }, [cellDescription, cellIdx, colSpan, hiddenColumnIndices]);
}

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { baseComponentId } = props;
  const { rows, textResourceBindings, labelSettings } = useItemWhenType(baseComponentId, 'Grid');
  const { title, description, help } = textResourceBindings ?? {};
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const shouldHaveFullWidth = parent?.type === 'page';
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const indexedId = useIndexedId(baseComponentId);

  const columnHiddenExprs = useMemo(() => rows?.find((r) => r.header)?.cells?.map(getGridCellHiddenExpr) ?? [], [rows]);
  const expressionDataSources = useExpressionDataSources(columnHiddenExprs);
  const hiddenColumnIndices = useMemo(
    () =>
      columnHiddenExprs.reduce<number[]>((indices, hiddenExpr, cellIdx) => {
        if (!ExprValidation.isValidOrScalar(hiddenExpr, ExprVal.Boolean)) {
          return indices;
        }
        const hidden = evalExpr(hiddenExpr, expressionDataSources, {
          returnType: ExprVal.Boolean,
          defaultValue: false,
          errorIntroText: `Invalid expression for hidden in Grid column ${cellIdx}`,
        });
        if (hidden) {
          indices.push(cellIdx);
        }
        return indices;
      }, []),
    [columnHiddenExprs, expressionDataSources],
  );

  if (isMobile) {
    return <MobileGrid {...props} />;
  }

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <Table
        id={indexedId}
        className={css.table}
      >
        {title && (
          <Caption
            className={cn({ [css.captionFullWidth]: shouldHaveFullWidth })}
            title={<Lang id={title} />}
            description={description && <Lang id={description} />}
            helpText={help ? { text: <Lang id={help} />, accessibleTitle } : undefined}
            labelSettings={labelSettings}
          />
        )}
        <GridRowsRenderer
          rows={rows}
          isNested={isNested}
          mutableColumnSettings={columnSettings}
          hiddenColumnIndices={hiddenColumnIndices}
        />
      </Table>
    </ConditionalWrapper>
  );
}

interface GridRowsProps {
  rows: GridRow[];
  extraCells?: GridCell[];
  isNested: boolean;
  mutableColumnSettings: ITableColumnFormatting;
  hiddenColumnIndices?: number[];
}

export function GridRowsRenderer({
  rows,
  extraCells = [],
  isNested,
  mutableColumnSettings,
  hiddenColumnIndices = [],
}: GridRowsProps) {
  const batches: { type: 'header' | 'body'; rows: GridRow[] }[] = [];

  for (const row of rows) {
    const type = row.header ? 'header' : 'body';
    const lastBatch = batches.at(-1);
    if (lastBatch?.type === type) {
      lastBatch.rows.push(row);
    } else {
      batches.push({ type, rows: [row] });
    }
  }

  return (
    <>
      {batches.map((batch, batchIdx) => {
        const WrapperComponent = batch.type === 'header' ? Table.Head : Table.Body;

        return (
          <WrapperComponent key={batchIdx}>
            {batch.rows.map((row, rowIdx) => (
              <GridRowRenderer
                key={rowIdx}
                row={{ ...row, cells: [...row.cells, ...extraCells] }}
                isNested={isNested}
                mutableColumnSettings={mutableColumnSettings}
                hiddenColumnIndices={hiddenColumnIndices}
              />
            ))}
          </WrapperComponent>
        );
      })}
    </>
  );
}

interface GridRowProps extends Omit<GridRowsProps, 'rows'> {
  row: GridRow;
}

function GridRowRenderer({ row, isNested, mutableColumnSettings, hiddenColumnIndices = [] }: GridRowProps) {
  const rowHidden = useIsGridRowHidden(row);
  if (rowHidden) {
    return null;
  }

  // Create array of cells with their original indices, then filter out hidden ones
  const cellsWithIndices = row.cells
    .map((cell, cellIdx) => ({ cell, cellIdx }))
    .filter(({ cellIdx }) => !hiddenColumnIndices.includes(cellIdx));

  return (
    <Table.Row className={row.readOnly ? css.rowReadOnly : undefined}>
      {cellsWithIndices.map(({ cell, cellIdx }, visibleIdx) => {
        const isFirst = visibleIdx === 0;
        const isLast = visibleIdx === cellsWithIndices.length - 1;
        const className = cn({
          [css.fullWidthCellFirst]: isFirst && !isNested,
          [css.fullWidthCellLast]: isLast && !isNested,
        });

        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          // eslint-disable-next-line react-compiler/react-compiler
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (isGridCellText(cell) || isGridCellLabelFrom(cell)) {
          let textCellSettings: GridColumnOptions = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};

          textCellSettings = { ...textCellSettings, ...cell.cellStyle, ...cell };

          if (isGridCellText(cell)) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                className={className}
                help={cell?.help}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
                cellIdx={cellIdx}
                hiddenColumnIndices={hiddenColumnIndices}
              >
                <Lang id={cell.text} />
              </CellWithText>
            );
          }

          return (
            <CellWithLabel
              key={`${cell.labelFrom}/${cellIdx}`}
              className={className}
              isHeader={row.header}
              columnStyleOptions={textCellSettings}
              labelFrom={cell.labelFrom}
              cellIdx={cellIdx}
              hiddenColumnIndices={hiddenColumnIndices}
            />
          );
        }

        const baseComponentId = isGridCellNode(cell) ? cell.component : undefined;
        if (!baseComponentId) {
          const CellComponent = row.header ? Table.HeaderCell : Table.Cell;
          return (
            <CellComponent
              key={cellIdx}
              className={className}
            />
          );
        }

        let componentCellSettings: GridColumnOptions | undefined =
          mutableColumnSettings[cellIdx] && structuredClone(mutableColumnSettings[cellIdx]);

        if (cell && 'cellStyle' in cell && cell.cellStyle) {
          componentCellSettings = componentCellSettings
            ? { ...componentCellSettings, ...cell.cellStyle }
            : { ...cell.cellStyle };
        }

        return (
          <CellWithComponent
            rowReadOnly={row.readOnly}
            key={`${baseComponentId}/${cellIdx}`}
            baseComponentId={baseComponentId}
            isHeader={row.header}
            className={className}
            columnStyleOptions={componentCellSettings}
            cellIdx={cellIdx}
            hiddenColumnIndices={hiddenColumnIndices}
          />
        );
      })}
    </Table.Row>
  );
}

interface CellProps {
  className?: string;
  columnStyleOptions?: GridColumnOptions;
  isHeader?: boolean;
  rowReadOnly?: boolean;
  cellIdx?: number;
  hiddenColumnIndices?: number[];
}

type GridColumnOptions = ITableColumnProperties & IGridColumnProperties;

interface CellWithComponentProps extends CellProps {
  baseComponentId: string;
}

interface CellWithTextProps extends PropsWithChildren, CellProps {
  help?: string;
}

interface CellWithLabelProps extends CellProps {
  labelFrom: string;
}

function CellWithComponent({
  baseComponentId,
  className,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
  cellIdx,
  hiddenColumnIndices,
}: CellWithComponentProps) {
  const isHidden = useIsHidden(baseComponentId);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const colSpanValue = useEvalExpression(columnStyleOptions?.colSpan, {
    returnType: ExprVal.Number,
    defaultValue: 1,
    errorIntroText: `Invalid expression for colSpan in Grid cell with component "${baseComponentId}"`,
  });
  useWarnIfColSpanOverlapsHiddenColumns({
    colSpan: colSpanValue,
    cellIdx: cellIdx ?? -1,
    hiddenColumnIndices,
    cellDescription: `with component "${baseComponentId}"`,
  });

  if (!isHidden) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
        colSpan={colSpanValue}
      >
        <GenericComponent
          baseComponentId={baseComponentId}
          overrideDisplay={{
            renderLabel: false,
            renderLegend: false,
            renderedInTable: true,
            rowReadOnly,
          }}
        />
      </CellComponent>
    );
  }

  return <CellComponent className={className} />;
}

function CellWithText({
  children,
  className,
  columnStyleOptions,
  help,
  isHeader = false,
  cellIdx,
  hiddenColumnIndices,
}: CellWithTextProps) {
  const colSpanValue = useEvalExpression(columnStyleOptions?.colSpan, {
    returnType: ExprVal.Number,
    defaultValue: 1,
    errorIntroText: 'Invalid expression for colSpan in Grid text cell',
  });
  useWarnIfColSpanOverlapsHiddenColumns({
    colSpan: colSpanValue,
    cellIdx: cellIdx ?? -1,
    hiddenColumnIndices,
    cellDescription: 'text',
  });

  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
      colSpan={colSpanValue}
    >
      <span className={help && css.textCell}>
        <span
          className={css.contentFormatting}
          style={columnStyles}
        >
          {children}
        </span>
        {help && (
          <HelpTextContainer
            title={elementAsString(children)}
            helpText={<Lang id={help} />}
          />
        )}
      </span>
    </CellComponent>
  );
}

function CellWithLabel({
  className,
  columnStyleOptions,
  labelFrom,
  isHeader = false,
  cellIdx,
  hiddenColumnIndices,
}: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const item = useItemFor(labelFrom);
  const trb = item.textResourceBindings;
  const required = 'required' in item && item.required;
  const colSpanValue = useEvalExpression(columnStyleOptions?.colSpan, {
    returnType: ExprVal.Number,
    defaultValue: 1,
    errorIntroText: `Invalid expression for colSpan in Grid cell with label from "${labelFrom}"`,
  });
  useWarnIfColSpanOverlapsHiddenColumns({
    colSpan: colSpanValue,
    cellIdx: cellIdx ?? -1,
    hiddenColumnIndices,
    cellDescription: `with label from "${labelFrom}"`,
  });
  const title = trb && 'title' in trb ? trb.title : undefined;
  const help = trb && 'help' in trb ? trb.help : undefined;
  const description = trb && 'description' in trb && typeof trb.description === 'string' ? trb.description : undefined;
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
      colSpan={colSpanValue}
    >
      <LabelContent
        id={useIndexedId(labelFrom)}
        label={title}
        required={required}
        help={help}
        description={description}
      />
    </CellComponent>
  );
}

function MobileGrid({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Grid'>) {
  const baseIds = useBaseIdsFromGrid(baseComponentId);

  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId,
    overrideDisplay,
  });

  return (
    <Fieldset
      id={useIndexedId(baseComponentId)}
      size='sm'
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
      className={css.mobileFieldset}
    >
      {baseIds.map((childId) => (
        <GenericComponent
          key={childId}
          baseComponentId={childId}
        />
      ))}
    </Fieldset>
  );
}
