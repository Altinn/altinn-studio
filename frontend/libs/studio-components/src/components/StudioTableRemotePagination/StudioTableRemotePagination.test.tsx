import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';

describe('StudioTableRemotePagination', () => {
  const paginationProps = {
    currentPage: 1,
    totalPages: 2,
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

  it('triggers the handleSorting function when a sortable column header is clicked', async () => {
    const handleSorting = jest.fn();
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} onSortClick={handleSorting} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Name' }));

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

  it('triggers the onPageChange callback when a page is clicked', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(paginationProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('triggers the onPageSizeChange callback when the page size is changed', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '10');

    expect(paginationProps.onPageSizeChange).toHaveBeenCalledWith(10);
  });
});
