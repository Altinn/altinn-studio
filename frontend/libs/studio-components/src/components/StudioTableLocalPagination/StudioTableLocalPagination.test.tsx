import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';

describe('StudioTableLocalPagination', () => {
  const paginationProps = {
    pageSizeOptions: [2, 5, 10],
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

    await userEvent.click(screen.getByRole('button', { name: 'Age' }));

    const tableBody = screen.getByRole('rowgroup');
    const rows = within(tableBody).getAllByRole('row');
    expect(within(rows[0]).getByRole('cell', { name: 'John Doe' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Jane Smith' })).toBeInTheDocument();
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

    expect(screen.getByRole('cell', { name: 'Bob Johnson' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Alice Brown' })).toBeInTheDocument();
  });

  it('changes page size when page size option is selected', async () => {
    render(
      <StudioTableLocalPagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '5');

    const tableBody = screen.getByRole('rowgroup');
    const rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(4);
  });
});
