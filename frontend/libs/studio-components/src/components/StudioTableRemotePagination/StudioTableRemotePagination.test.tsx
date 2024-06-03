import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import type { PaginationProps } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';

describe('StudioTableRemotePagination', () => {
  const paginationProps: PaginationProps = {
    currentPage: 1,
    totalPages: 2,
    totalRows: rows.length,
    pageSize: 5,
    pageSizeOptions: [5, 10, 20],
    pageSizeLabel: 'Rows per page',
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    nextButtonText: 'Next',
    previousButtonText: 'Previous',
    itemLabel: (num) => `Page ${num}`,
  };

  it('renders the table with columns and rows', () => {
    render(<StudioTableRemotePagination columns={columns} rows={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Created by' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Coordinated register notification' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'The Norwegian Directorate of Health' }),
    ).toBeInTheDocument();
  });

  it('renders sorting button only when specified in column object', async () => {
    const handleSorting = jest.fn();
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} onSortClick={handleSorting} />,
    );

    const sortByNameButton = screen.queryByRole('button', { name: 'Name' });
    const sortByCreatedByButton = screen.queryByRole('button', { name: 'Created by' });

    expect(sortByNameButton).toBeInTheDocument();
    expect(sortByCreatedByButton).not.toBeInTheDocument();
  });

  it('triggers the handleSorting function when a sortable column header is clicked', async () => {
    const handleSorting = jest.fn();
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} onSortClick={handleSorting} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Name' }));

    expect(handleSorting).toHaveBeenCalledWith('name');
  });

  it('renders the pagination controls when pagination prop is provided', () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('does not render the pagination controls when pagination prop is not provided', () => {
    render(<StudioTableRemotePagination columns={columns} rows={rows} />);

    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('triggers the onPageChange function when "Next" is clicked', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(paginationProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('triggers the onPageChange function when "Page 2" is clicked', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(paginationProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('triggers the onPageSizeChange function when the page size is changed', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '10');

    expect(paginationProps.onPageSizeChange).toHaveBeenCalledWith(10);
  });

  it('displays the empty table message when there are no rows to display', () => {
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={[]}
        emptyTableMessage='No rows to display'
      />,
    );
    expect(screen.getByText('No rows to display')).toBeInTheDocument();
  });
});
