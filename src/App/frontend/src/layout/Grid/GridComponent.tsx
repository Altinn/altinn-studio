import React from 'react';
import type { PropsWithChildren } from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Caption } from 'src/components/form/caption/Caption';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { LabelContent } from 'src/components/label/LabelContent';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import {
  isGridCellLabelFrom,
  isGridCellNode,
  isGridCellText,
  useBaseIdsFromGrid,
  useIsGridRowHidden,
} from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { GridCell, GridRow, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/common.generated';

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { baseComponentId } = props;
  const { rows, textResourceBindings, labelSettings } = useItemWhenType(baseComponentId, 'Grid');
  const { title, description, help } = textResourceBindings ?? {};
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const parent = useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const shouldHaveFullWidth = parent?.type === 'page';
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const indexedId = useIndexedId(baseComponentId);

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
}

export function GridRowsRenderer({ rows, extraCells = [], isNested, mutableColumnSettings }: GridRowsProps) {
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

function GridRowRenderer({ row, isNested, mutableColumnSettings }: GridRowProps) {
  const rowHidden = useIsGridRowHidden(row);
  if (rowHidden) {
    return null;
  }

  return (
    <Table.Row className={row.readOnly ? css.rowReadOnly : undefined}>
      {row.cells.map((cell, cellIdx) => {
        const isFirst = cellIdx === 0;
        const isLast = cellIdx === row.cells.length - 1;
        const className = cn({
          [css.fullWidthCellFirst]: isFirst && !isNested,
          [css.fullWidthCellLast]: isLast && !isNested,
        });

        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          // eslint-disable-next-line react-compiler/react-compiler
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (isGridCellText(cell) || isGridCellLabelFrom(cell)) {
          let textCellSettings: ITableColumnProperties = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};
          textCellSettings = { ...textCellSettings, ...cell };

          if (isGridCellText(cell)) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                className={className}
                help={cell?.help}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
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

        return (
          <CellWithComponent
            rowReadOnly={row.readOnly}
            key={`${baseComponentId}/${cellIdx}`}
            baseComponentId={baseComponentId}
            isHeader={row.header}
            className={className}
            columnStyleOptions={mutableColumnSettings[cellIdx]}
          />
        );
      })}
    </Table.Row>
  );
}

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
}

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
}: CellWithComponentProps) {
  const isHidden = useIsHidden(baseComponentId);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  if (!isHidden) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
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

function CellWithText({ children, className, columnStyleOptions, help, isHeader = false }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
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

function CellWithLabel({ className, columnStyleOptions, labelFrom, isHeader = false }: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const item = useItemFor(labelFrom);
  const trb = item.textResourceBindings;
  const required = 'required' in item && item.required;

  const title = trb && 'title' in trb ? trb.title : undefined;
  const help = trb && 'help' in trb ? trb.help : undefined;
  const description = trb && 'description' in trb && typeof trb.description === 'string' ? trb.description : undefined;
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
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
