import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import type { LocalPaginationProps } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';
import type { Rows, Columns } from '../StudioTableRemotePagination';

describe('StudioTableLocalPagination', () => {
  const paginationProps: LocalPaginationProps = {
    pageSizeOptions: [5, 10, 50],
    paginationTexts: {
      pageSizeLabel: 'Rows per page',
      showingRowText: 'Showing rows',
      ofText: 'of',
      nextButtonAriaLabel: 'Next',
      previousButtonAriaLabel: 'Previous',
      numberButtonAriaLabel: (number) => `Page ${number}`,
    },
  };

  it('renders the table with columns and rows', () => {
    render(<StudioTableLocalPagination columns={columns} rows={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Created by' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Coordinated register notification' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'The Norwegian Directorate of Health' }),
    ).toBeInTheDocument();
  });

  it('renders sorting button only when specified in column prop', async () => {
    render(<StudioTableLocalPagination columns={columns} rows={rows} />);

    const sortByNameButton = screen.queryByRole('button', { name: 'Name' });
    const sortByCreatedByButton = screen.queryByRole('button', { name: 'Created by' });

    expect(sortByNameButton).toBeInTheDocument();
    expect(sortByCreatedByButton).not.toBeInTheDocument();
  });

  it('triggers sorting when a sortable column header is clicked', async () => {
    render(<StudioTableLocalPagination columns={columns} rows={rows} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Name' }));
    const [, firstBodyRow, secondBodyRow] = screen.getAllByRole('row');

    expect(
      within(firstBodyRow).getByRole('cell', { name: 'A-melding – all forms' }),
    ).toBeInTheDocument();

    expect(
      within(secondBodyRow).getByRole('cell', { name: 'Application for VAT registration' }),
    ).toBeInTheDocument();
  });

  it('renders the complete table when pagination prop is not provided', () => {
    render(<StudioTableLocalPagination columns={columns} rows={rows} />);
    expect(
      screen.getByRole('cell', { name: 'Coordinated register notification' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Application for a certificate of good conduct' }),
    ).toBeInTheDocument();
  });

  it('renders pagination controls when pagination prop is provided', () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('changes page when the "Next" button is clicked', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      screen.queryByRole('cell', { name: 'Coordinated register notification' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A-melding – all forms' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Application for VAT registration' }),
    ).toBeInTheDocument();
  });

  it('changes page when the "Page 2" button is clicked', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(
      screen.queryByRole('cell', { name: 'Coordinated register notification' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A-melding – all forms' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Application for VAT registration' }),
    ).toBeInTheDocument();
  });

  it('changes page size when a different page size option is selected', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '10');

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const tableBodyRows = within(tableBody).getAllByRole('row');
    expect(tableBodyRows).toHaveLength(10);
  });

  it('fallbacks to page 1 when no rows are displayed (out of bounds)', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Page 4' }));
    const lastPageBody = screen.getAllByRole('rowgroup')[1];
    const lastPageRow = within(lastPageBody).getAllByRole('row');
    expect(lastPageRow.length).toBe(1);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    const tableBody = screen.getAllByRole('rowgroup')[1];
    const tableBodyRows = within(tableBody).getAllByRole('row');
    expect(tableBodyRows.length).toBe(16);
  });

  it('displays the empty table message when there are no rows to display', () => {
    render(
      <StudioTableLocalPagination
        columns={columns}
        rows={[]}
        emptyTableMessage='No rows to display'
      />,
    );
    expect(screen.getByText('No rows to display')).toBeInTheDocument();
  });

  it('formats cells when a valueFormatter is specified', () => {
    const testColumn: Columns = [
      {
        accessor: 'name',
        value: 'Name',
        valueFormatter: (value) => `Formatted: ${value}`,
      },
    ];
    const testRow: Rows = [{ id: 1, name: 'Sophie Salt' }];

    render(<StudioTableLocalPagination columns={testColumn} rows={testRow} />);

    const formattedNameCell = screen.getByText('Formatted: Sophie Salt');
    expect(formattedNameCell).toBeInTheDocument();

    const unFormattedNameCell = screen.queryByText('Sophie Salt');
    expect(unFormattedNameCell).not.toBeInTheDocument();
  });
});
