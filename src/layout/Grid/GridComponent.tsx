import React from 'react';
import type { PropsWithChildren } from 'react';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@digdir/design-system-react';
import { Grid, useMediaQuery } from '@material-ui/core';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import { isGridRowHidden, nodesFromGrid } from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { GridRow } from 'src/layout/Grid/types';
import type { ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function GridComponent(props: PropsFromGenericComponent<'Grid'>) {
  const { node, getTextResource } = props;
  const { rows } = node.item;
  const shouldHaveFullWidth = node.parent instanceof LayoutPage;
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return <MobileGrid {...props} />;
  }

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <Table id={node.item.id}>
        {rows.map((row, rowIdx) =>
          isGridRowHidden(row) ? null : (
            <Row
              key={rowIdx}
              header={row.header}
              readOnly={row.readOnly}
            >
              {row.cells.map((cell, cellIdx) => {
                const isFirst = cellIdx === 0;
                const isLast = cellIdx === row.cells.length - 1;
                const className = cn({
                  [css.fullWidthCellFirst]: isFirst,
                  [css.fullWidthCellLast]: isLast,
                });

                if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
                  columnSettings[cellIdx] = cell.columnOptions;
                }

                if (cell && 'text' in cell) {
                  let textCellSettings: ITableColumnProperties = columnSettings[cellIdx]
                    ? structuredClone(columnSettings[cellIdx])
                    : {};
                  textCellSettings = { ...textCellSettings, ...cell };

                  return (
                    <CellWithText
                      key={cell.text}
                      className={className}
                      columnStyleOptions={textCellSettings}
                    >
                      {getTextResource(cell.text)}
                    </CellWithText>
                  );
                }

                const node = cell?.node as LayoutNode;
                const componentId = node?.item.id;
                return (
                  <CellWithComponent
                    key={componentId || `${rowIdx}-${cellIdx}`}
                    node={node}
                    className={className}
                    columnStyleOptions={columnSettings[cellIdx]}
                  />
                );
              })}
            </Row>
          ),
        )}
      </Table>
    </ConditionalWrapper>
  );
}

type RowProps = PropsWithChildren<Pick<GridRow<any>, 'header' | 'readOnly'>>;

function Row({ header, readOnly, children }: RowProps) {
  const className = readOnly ? css.rowReadOnly : undefined;

  if (header) {
    return (
      <TableHeader>
        <TableRow className={className}>{children}</TableRow>
      </TableHeader>
    );
  }

  return (
    <TableBody>
      <TableRow className={className}>{children}</TableRow>
    </TableBody>
  );
}

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
}

interface CellWithComponentProps extends CellProps {
  node?: LayoutNode;
}

function CellWithComponent({ node, className, columnStyleOptions }: CellWithComponentProps) {
  if (node && !node.isHidden()) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <TableCell
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
      >
        <GenericComponent
          node={node}
          overrideDisplay={{
            renderLabel: false,
            renderLegend: false,
            renderedInTable: true,
          }}
        />
      </TableCell>
    );
  }

  return <TableCell className={className} />;
}

type CellWithTextProps = CellProps & PropsWithChildren;

function CellWithText({ children, className, columnStyleOptions }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  return (
    <TableCell
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      <span
        className={css.contentFormatting}
        style={columnStyles}
      >
        {children}
      </span>
    </TableCell>
  );
}

function MobileGrid({ node }: PropsFromGenericComponent<'Grid'>) {
  return (
    <Grid
      id={node.item.id}
      container={true}
      item={true}
      spacing={3}
      alignItems='flex-start'
    >
      {nodesFromGrid(node)
        .filter((child) => !child.isHidden())
        .map((child) => (
          <GenericComponent
            key={child.item.id}
            node={child}
          />
        ))}
    </Grid>
  );
}
