import React from 'react';
import type { PropsWithChildren } from 'react';

import { ConditionalWrapper, Fieldset, FullWidthWrapper, HelpTextContainer, useIsMobile } from '@app/form-component';
import { CommonExpressions, Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type {
  GridCell,
  IGridColumnProperties,
  ITableColumnFormatting,
  ITableColumnProperties,
} from '@app/layout-contract/generated/common.generated';

import { Caption } from 'src/components/form/caption/Caption';
import { LabelContent } from 'src/components/label/LabelContent';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import { isGridCellLabelFrom, isGridCellNode, isGridCellText, useBaseIdsFromGrid } from 'src/layout/Grid/tools';
import { type GridRowLayout, useGridRows } from 'src/layout/Grid/useGridRows';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentIsRequired } from 'src/utils/layout/useComponentIsRequired';
import { useEvalExpression, useEvalOptionalText, useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import type { PropsFromGenericComponent } from 'src/layout';

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { baseComponentId } = props;
  const config = useComponentConfig(baseComponentId, 'Grid');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Grid.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Grid.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Grid.textResourceBindings.help);

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const shouldHaveFullWidth = parent?.type === 'page';
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const indexedId = useIndexedId(baseComponentId);

  const grid = useGridRows(config.rows);

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
            helpText={
              help
                ? {
                    text: <Lang id={help} />,
                    accessibleTitle,
                  }
                : undefined
            }
            labelSettings={config.labelSettings}
          />
        )}
        <GridRowsRenderer
          rows={grid.visibleRows()}
          isNested={isNested}
          mutableColumnSettings={columnSettings}
        />
      </Table>
    </ConditionalWrapper>
  );
}

interface GridRowsProps {
  rows: GridRowLayout[];
  extraCells?: GridCell[];
  isNested: boolean;
  mutableColumnSettings: ITableColumnFormatting;
  bodyClassName?: string;
}

export function GridRowsRenderer({
  rows,
  extraCells = [],
  isNested,
  mutableColumnSettings,
  bodyClassName,
}: GridRowsProps) {
  const batches: { type: 'header' | 'body'; rows: GridRowLayout[] }[] = [];

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
          <WrapperComponent
            key={batchIdx}
            className={batch.type === 'body' ? bodyClassName : undefined}
          >
            {batch.rows.map((row, rowIdx) => (
              <GridRowRenderer
                key={rowIdx}
                row={row}
                extraCells={extraCells}
                isNested={isNested}
                mutableColumnSettings={mutableColumnSettings}
              />
            ))}
          </WrapperComponent>
        );
      })}
    </>
  );
}

interface GridRowProps extends Omit<GridRowsProps, 'rows'> {
  row: GridRowLayout;
}

function GridRowRenderer({ row, isNested, mutableColumnSettings, extraCells = [] }: GridRowProps) {
  const lastCell = row.cells.at(-1);
  const extraColumnStart = lastCell ? lastCell.columnIndex + lastCell.colSpan : 0;
  const cells = [
    ...row.cells,
    ...extraCells.map((cell, index) => ({ cell, columnIndex: extraColumnStart + index, colSpan: 1 })),
  ];

  return (
    <Table.Row className={row.readOnly ? css.rowReadOnly : undefined}>
      {cells.map(({ cell, columnIndex: cellIdx, colSpan }, visibleIdx) => {
        const isFirst = visibleIdx === 0;
        const isLast = visibleIdx === cells.length - 1;
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
                colSpan={colSpan}
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
              colSpan={colSpan}
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
              colSpan={colSpan}
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
            colSpan={colSpan}
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
  colSpan: number;
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
  colSpan,
}: CellWithComponentProps) {
  const isHidden = useIsHidden(baseComponentId);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  if (!isHidden) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
        colSpan={colSpan}
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

  return (
    <CellComponent
      className={className}
      colSpan={colSpan}
    />
  );
}

function CellWithText({ children, className, columnStyleOptions, help, isHeader = false, colSpan }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
      colSpan={colSpan}
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

function CellWithLabel({ className, columnStyleOptions, labelFrom, isHeader = false, colSpan }: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const config = useComponentConfig(labelFrom);
  const readOnly = useEvalExpression('readOnly' in config ? config.readOnly : undefined, CommonExpressions.readOnly);
  const title = useEvalOptionalTrb(config, 'title', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(config, 'help', CommonExpressions.TRBLabel);
  const description = useEvalOptionalTrb(config, 'description', CommonExpressions.TRBLabel);

  const labelSettings = config.type !== 'Custom' && 'labelSettings' in config ? config.labelSettings : undefined;
  const required = useComponentIsRequired(config);

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
      colSpan={colSpan}
    >
      <LabelContent
        id={useIndexedId(labelFrom)}
        label={title}
        required={required}
        readOnly={readOnly}
        labelSettings={labelSettings}
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
