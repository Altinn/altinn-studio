import React from 'react';

import { Table } from '@digdir/designsystemet-react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useIsMobile } from 'nextsrc/utils/useDeviceWidths';
import classes from 'nextsrc/libs/form-engine/components/Grid/Grid.module.css';
import {
  getColumnStyles,
  isGridCellLabelFrom,
  isGridCellNode,
  isGridCellText,
} from 'nextsrc/libs/form-engine/components/Grid/gridTools';
import { findComponentById } from 'nextsrc/libs/form-engine/utils/findComponent';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompGridExternal } from 'src/layout/Grid/config.generated';
import type { GridCell, GridRow, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/common.generated';

export const Grid = ({ component, renderChildren }: ComponentProps) => {
  const props = component as CompGridExternal;
  const { rows } = props;
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileGrid component={component} renderChildren={renderChildren} />;
  }

  const columnSettings: ITableColumnFormatting = {};

  return (
    <Table id={props.id} className={classes.table}>
      <GridRowsRenderer
        rows={rows}
        mutableColumnSettings={columnSettings}
        renderChildren={renderChildren}
      />
    </Table>
  );
};

interface GridRowsProps {
  rows: GridRow[];
  mutableColumnSettings: ITableColumnFormatting;
  renderChildren: ComponentProps['renderChildren'];
}

function GridRowsRenderer({ rows, mutableColumnSettings, renderChildren }: GridRowsProps) {
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
                row={row}
                mutableColumnSettings={mutableColumnSettings}
                renderChildren={renderChildren}
              />
            ))}
          </WrapperComponent>
        );
      })}
    </>
  );
}

interface GridRowProps {
  row: GridRow;
  mutableColumnSettings: ITableColumnFormatting;
  renderChildren: ComponentProps['renderChildren'];
}

function GridRowRenderer({ row, mutableColumnSettings, renderChildren }: GridRowProps) {
  return (
    <Table.Row className={row.readOnly ? classes.rowReadOnly : undefined}>
      {row.cells.map((cell, cellIdx) => {
        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (isGridCellText(cell)) {
          return (
            <CellWithText
              key={`${cell.text}/${cellIdx}`}
              cell={cell}
              isHeader={row.header}
              columnSettings={mutableColumnSettings[cellIdx]}
            />
          );
        }

        if (isGridCellLabelFrom(cell)) {
          return (
            <CellWithLabel
              key={`${cell.labelFrom}/${cellIdx}`}
              labelFrom={cell.labelFrom}
              isHeader={row.header}
              columnSettings={mutableColumnSettings[cellIdx]}
            />
          );
        }

        if (isGridCellNode(cell) && cell.component) {
          return (
            <CellWithComponent
              key={`${cell.component}/${cellIdx}`}
              componentId={cell.component}
              isHeader={row.header}
              columnSettings={mutableColumnSettings[cellIdx]}
              rowReadOnly={row.readOnly}
              renderChildren={renderChildren}
            />
          );
        }

        const CellComponent = row.header ? Table.HeaderCell : Table.Cell;
        return <CellComponent key={cellIdx} />;
      })}
    </Table.Row>
  );
}

interface CellWithTextProps {
  cell: GridCell & { text: string; help?: string };
  isHeader?: boolean;
  columnSettings?: ITableColumnProperties;
}

function CellWithText({ cell, isHeader, columnSettings }: CellWithTextProps) {
  const { langAsString } = useLanguage();
  const textCellSettings: ITableColumnProperties = { ...structuredClone(columnSettings ?? {}), ...cell };
  const columnStyles = getColumnStyles(textCellSettings);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent className={classes.tableCellFormatting} style={columnStyles}>
      <span className={cell.help ? classes.textCell : undefined}>
        <span className={classes.contentFormatting} style={columnStyles}>
          {langAsString(cell.text)}
        </span>
      </span>
    </CellComponent>
  );
}

interface CellWithLabelProps {
  labelFrom: string;
  isHeader?: boolean;
  columnSettings?: ITableColumnProperties;
}

function CellWithLabel({ labelFrom, isHeader, columnSettings }: CellWithLabelProps) {
  const client = useFormClient();
  const { langAsString } = useLanguage();
  const comp = findComponentById(client, labelFrom);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const columnStyles = columnSettings ? getColumnStyles(columnSettings) : undefined;

  if (!comp) {
    return <CellComponent />;
  }

  const trb = (comp as { textResourceBindings?: { title?: string } }).textResourceBindings;
  const title = trb?.title;
  const required = 'required' in comp && comp.required;

  return (
    <CellComponent className={classes.tableCellFormatting} style={columnStyles}>
      <span>
        {langAsString(title)}
        {required ? ' *' : ''}
      </span>
    </CellComponent>
  );
}

interface CellWithComponentProps {
  componentId: string;
  isHeader?: boolean;
  columnSettings?: ITableColumnProperties;
  rowReadOnly?: boolean;
  renderChildren: ComponentProps['renderChildren'];
}

function CellWithComponent({ componentId, isHeader, columnSettings, renderChildren }: CellWithComponentProps) {
  const client = useFormClient();
  const comp = findComponentById(client, componentId);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const columnStyles = columnSettings ? getColumnStyles(columnSettings) : undefined;

  if (!comp) {
    return <CellComponent />;
  }

  return (
    <CellComponent className={classes.tableCellFormatting} style={columnStyles}>
      {renderChildren([comp])}
    </CellComponent>
  );
}

function MobileGrid({ component, renderChildren }: ComponentProps) {
  const client = useFormClient();
  const props = component as CompGridExternal;

  const allComponentIds: string[] = [];
  for (const row of props.rows) {
    for (const cell of row.cells) {
      if (isGridCellNode(cell) && cell.component) {
        allComponentIds.push(cell.component);
      }
    }
  }

  const childComponents = allComponentIds
    .map((id) => findComponentById(client, id))
    .filter((c): c is ResolvedCompExternal => c != null);

  return (
    <fieldset className={classes.mobileFieldset}>
      {renderChildren(childComponents)}
    </fieldset>
  );
}
