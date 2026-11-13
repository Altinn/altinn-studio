import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from './BaseTable.module.css';

/**
 * Each property is one way in which a table looks different from the designsystem default. With no properties set,
 * BaseTable is the designsystem Table.
 */
export interface BaseTableLook {
  /** A light shadow under the table */
  shadow?: boolean;
  /** A border above the table on screens below the md breakpoint */
  topBorderOnSmallScreens?: boolean;
  /**
   * 'gray' is #f5f5f5, 'tinted' is the neutral tinted background. 'tintedThead' tints only header cells in a thead,
   * which differs from 'tinted' only in tables nested in cells (see lookReachesNestedTables).
   */
  headerBackground?: 'gray' | 'tinted' | 'tintedThead';
  headerFontWeight?: 'medium';
  /** The line under the header. 'light' is a 1px #dde3e5 line, 'strong' is a 2px neutral line */
  headerDivider?: 'light' | 'strong';
  /** Vertical padding in header cells. 'medium' is ds-size-3, 'large' is 15px */
  headerPadding?: 'medium' | 'large';
  /** The line under each row. 'light' is #dde3e5, 'dashed' is a dashed strong neutral line */
  rowDivider?: 'light' | 'dashed';
  /** Vertical padding in body cells. 'medium' is 12px, 'large' is ds-size-4 */
  cellPadding?: 'medium' | 'large';
  /** 'large' is at least 60px */
  rowHeight?: 'large';
  /** 'large' is 16px */
  cellFontSize?: 'large';
  /** 'gray' is #f5f5f5 with a light line under the footer instead of the designsystem line above it */
  footerBackground?: 'gray';
  /**
   * By default, the properties above style only this table's own cells. 'all' also styles the cells of tables nested
   * in its cells, such as a Markdown table in a text, and 'headers' styles only their header cells. Some tables used
   * to do that, and this keeps them looking the same.
   */
  lookReachesNestedTables?: 'all' | 'headers';
}

/** How the table is laid out, as opposed to how it looks */
export interface BaseTableLayout {
  /**
   * Shows each row as a block with its cells stacked, and the header row hidden. Cells show their column header from
   * their `data-header-title` attribute. 'framed' has thin lines between rows and thick lines above and below the
   * table. 'divided' has thick lines between rows.
   */
  stackedRows?: 'framed' | 'divided';
  /** Pads the first and last cell of each row with --modal-padding-x, for a table that reaches the edges of the page */
  fullWidth?: boolean;
}

export type BaseTableProps = ComponentPropsWithoutRef<typeof Table> &
  BaseTableLook &
  BaseTableLayout;

const BaseTableRoot = forwardRef<HTMLTableElement, BaseTableProps>(function BaseTable(
  {
    shadow,
    topBorderOnSmallScreens,
    headerBackground,
    headerFontWeight,
    headerDivider,
    headerPadding,
    rowDivider,
    cellPadding,
    rowHeight,
    cellFontSize,
    footerBackground,
    lookReachesNestedTables,
    stackedRows,
    fullWidth,
    className,
    ...rest
  },
  ref,
) {
  return (
    <Table
      ref={ref}
      className={cn(
        classes.table,
        {
          [classes.shadow]: shadow,
          [classes.topBorderOnSmallScreens]: topBorderOnSmallScreens,
          [classes.headerBackgroundGray]: headerBackground === 'gray',
          [classes.headerBackgroundTinted]: headerBackground === 'tinted',
          [classes.headerBackgroundTintedThead]: headerBackground === 'tintedThead',
          [classes.headerFontWeightMedium]: headerFontWeight === 'medium',
          [classes.headerDividerLight]: headerDivider === 'light',
          [classes.headerDividerStrong]: headerDivider === 'strong',
          [classes.headerPaddingMedium]: headerPadding === 'medium',
          [classes.headerPaddingLarge]: headerPadding === 'large',
          [classes.rowDividerLight]: rowDivider === 'light',
          [classes.rowDividerDashed]: rowDivider === 'dashed',
          [classes.cellPaddingMedium]: cellPadding === 'medium',
          [classes.cellPaddingLarge]: cellPadding === 'large',
          [classes.rowHeightLarge]: rowHeight === 'large',
          [classes.cellFontSizeLarge]: cellFontSize === 'large',
          [classes.footerBackgroundGray]: footerBackground === 'gray',
          [classes.lookInNestedTables]: lookReachesNestedTables === 'all',
          [classes.headerLookInNestedTables]: lookReachesNestedTables === 'headers',
          [classes.stackedRows]: !!stackedRows,
          [classes.stackedRowsFramed]: stackedRows === 'framed',
          [classes.stackedRowsDivided]: stackedRows === 'divided',
          [classes.fullWidth]: fullWidth,
        },
        className,
      )}
      {...rest}
    />
  );
});

type RowProps = ComponentPropsWithoutRef<typeof Table.Row> & {
  /** Gives every cell in the row the error background */
  error?: boolean;
  /** 'tinted' is the neutral tinted background */
  background?: 'tinted';
};

const Row = forwardRef<HTMLTableRowElement, RowProps>(function BaseTableRow(
  { error, background, className, ...rest },
  ref,
) {
  return (
    <Table.Row
      ref={ref}
      className={cn(
        { [classes.rowError]: error, [classes.rowBackgroundTinted]: background === 'tinted' },
        className,
      )}
      {...rest}
    />
  );
});

type ColumnWidthProps = {
  /**
   * Takes the width from the --cell-width custom property in the cell's style. The first and last cells are made wider
   * to make room for the page padding.
   */
  columnWidth?: boolean;
};

type HeaderCellProps = ComponentPropsWithoutRef<typeof Table.HeaderCell> & ColumnWidthProps;

const HeaderCell = forwardRef<HTMLTableCellElement, HeaderCellProps>(function BaseTableHeaderCell(
  { columnWidth, className, ...rest },
  ref,
) {
  return (
    <Table.HeaderCell
      ref={ref}
      className={cn({ [classes.columnWidth]: columnWidth }, className)}
      {...rest}
    />
  );
});

type CellProps = ComponentPropsWithoutRef<typeof Table.Cell> & ColumnWidthProps;

const Cell = forwardRef<HTMLTableCellElement, CellProps>(function BaseTableCell(
  { columnWidth, className, ...rest },
  ref,
) {
  return (
    <Table.Cell
      ref={ref}
      className={cn({ [classes.columnWidth]: columnWidth }, className)}
      {...rest}
    />
  );
});

/** A cell as narrow as its buttons, with the buttons stacked and aligned to the end */
function ButtonCell({
  children,
  className,
  ...rest
}: PropsWithChildren<ComponentPropsWithoutRef<typeof Table.Cell>>) {
  return (
    <Table.Cell className={cn(classes.buttonCell, className)} {...rest}>
      <div className={classes.buttonCellContent}>{children}</div>
    </Table.Cell>
  );
}

/** A bar for pagination controls under a table, with the neutral tinted background */
function Pager({
  centered,
  className,
  ...rest
}: ComponentPropsWithoutRef<'div'> & { centered?: boolean }) {
  return (
    <div
      className={cn(classes.pager, { [classes.pagerCentered]: centered }, className)}
      {...rest}
    />
  );
}

export const BaseTable = Object.assign(BaseTableRoot, {
  Head: Table.Head,
  Body: Table.Body,
  Foot: Table.Foot,
  Row,
  HeaderCell,
  Cell,
  ButtonCell,
  Pager,
});
