import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';

describe('StudioTableLocalPagination', () => {
  const paginationProps = {
    pageSizeOptions: [5, 10, 50],
    pageSizeLabel: 'Rows per page',
    nextButtonText: 'Next',
    previousButtonText: 'Previous',
    itemLabel: (num) => `Page ${num}`,
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

  it('triggers sorting when a sortable column header is clicked', async () => {
    render(<StudioTableLocalPagination columns={columns} rows={rows} isSortable />);

    await userEvent.click(screen.getByRole('button', { name: 'Name' }));

    const firstBodyRow = screen.getAllByRole('row')[1];
    expect(
      within(firstBodyRow).getByRole('cell', { name: 'A-melding – all forms' }),
    ).toBeInTheDocument();

    const secondBodyRow = screen.getAllByRole('row')[2];
    expect(
      within(secondBodyRow).getByRole('cell', { name: 'Application for VAT registration' }),
    ).toBeInTheDocument();
  });

  it('renders pagination controls when pagination prop is provided', () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('changes page when next button is clicked', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      screen.queryByRole('cell', { name: 'Coordinated register notification' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A-melding – all forms' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Application for VAT registration' }),
    ).toBeInTheDocument();
  });

  it('changes page size when page size option is selected', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '10');

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const tableBodyRows = within(tableBody).getAllByRole('row');
    expect(tableBodyRows).toHaveLength(10);
  });

  it('sets currentPage to 1 when no rows are displayed', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    const lastPageBody = screen.getAllByRole('rowgroup')[1];
    const lastPageRow = within(lastPageBody).getAllByRole('row');
    expect(lastPageRow.length).toBe(1);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    const tableBody = screen.getAllByRole('rowgroup')[1];
    const tableBodyRows = within(tableBody).getAllByRole('row');
    expect(tableBodyRows.length).toBeGreaterThan(10);
  });
});
