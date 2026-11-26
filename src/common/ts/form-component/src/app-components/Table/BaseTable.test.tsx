import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';

import { BaseTable } from './BaseTable';
import classes from './BaseTable.module.css';

function renderTable(props: ComponentProps<typeof BaseTable> = {}) {
  return render(
    <BaseTable data-testid='table' {...props}>
      <BaseTable.Head>
        <BaseTable.Row>
          <BaseTable.HeaderCell>Name</BaseTable.HeaderCell>
        </BaseTable.Row>
      </BaseTable.Head>
      <BaseTable.Body>
        <BaseTable.Row>
          <BaseTable.Cell>Alice</BaseTable.Cell>
        </BaseTable.Row>
      </BaseTable.Body>
    </BaseTable>,
  );
}

describe('BaseTable', () => {
  it('renders a designsystem table with only the base class when no look properties are set', () => {
    renderTable();
    const table = screen.getByTestId('table');
    expect(table.tagName).toBe('TABLE');
    expect(table).toHaveClass('ds-table');
    expect(table.className.split(' ').filter((name) => name !== 'ds-table')).toEqual([
      classes.table,
    ]);
  });

  it('adds one class per look property', () => {
    renderTable({
      shadow: true,
      topBorderOnSmallScreens: true,
      headerBackground: 'gray',
      headerFontWeight: 'medium',
      headerDivider: 'light',
      headerPadding: 'large',
      rowDivider: 'light',
      cellPadding: 'medium',
      rowHeight: 'large',
      cellFontSize: 'large',
      footerBackground: 'gray',
    });
    const table = screen.getByTestId('table');
    for (const name of [
      classes.shadow,
      classes.topBorderOnSmallScreens,
      classes.headerBackgroundGray,
      classes.headerFontWeightMedium,
      classes.headerDividerLight,
      classes.headerPaddingLarge,
      classes.rowDividerLight,
      classes.cellPaddingMedium,
      classes.rowHeightLarge,
      classes.cellFontSizeLarge,
      classes.footerBackgroundGray,
    ]) {
      expect(table).toHaveClass(name);
    }
  });

  it('marks whether the look reaches nested tables', () => {
    expect(classes.lookInNestedTables).toBeTruthy();
    expect(classes.headerLookInNestedTables).toBeTruthy();
    const { unmount } = renderTable({ lookReachesNestedTables: 'all' });
    expect(screen.getByTestId('table')).toHaveClass(classes.lookInNestedTables);
    unmount();
    renderTable({ lookReachesNestedTables: 'headers' });
    expect(screen.getByTestId('table')).toHaveClass(classes.headerLookInNestedTables);
  });

  it('adds the tintedThead class for headerBackground tintedThead', () => {
    expect(classes.headerBackgroundTintedThead).toBeTruthy();
    renderTable({ headerBackground: 'tintedThead' });
    expect(screen.getByTestId('table')).toHaveClass(classes.headerBackgroundTintedThead);
  });

  it('passes designsystem properties and class names through', () => {
    renderTable({ border: true, className: 'custom' });
    const table = screen.getByTestId('table');
    expect(table).toHaveAttribute('data-border');
    expect(table).toHaveClass('custom');
  });
});
