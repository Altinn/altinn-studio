import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';

describe('StudioTableRemotePagination', () => {
  const columns = [
    { accessor: 'name', value: 'Name' },
    { accessor: 'age', value: 'Age' },
  ];

  const rows = [
    { id: 1, name: 'John Doe', age: 25 },
    { id: 2, name: 'Jane Smith', age: 30 },
  ];

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
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Jane Smith' })).toBeInTheDocument();
  });

  it('triggers the onSortClick callback when a sortable column header is clicked', async () => {
    const onSortClick = jest.fn();
    render(<StudioTableRemotePagination columns={columns} rows={rows} onSortClick={onSortClick} />);

    await userEvent.click(screen.getByRole('columnheader', { name: 'Name' }));

    expect(onSortClick).toHaveBeenCalledWith('name');
  });

  it('renders the pagination controls when pagination prop is provided', () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );

    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
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
