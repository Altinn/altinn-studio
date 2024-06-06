import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import type { RemotePaginationProps, Columns, Rows } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';

describe('StudioTableRemotePagination', () => {
  const paginationProps: RemotePaginationProps = {
    currentPage: 1,
    totalPages: 4,
    totalRows: rows.length,
    pageSize: 5,
    pageSizeOptions: [5, 10, 20, 50],
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    paginationTexts: {
      pageSizeLabel: 'Rows per page',
      showingRowText: 'Showing rows',
      ofText: 'of',
      nextButtonAriaLabel: 'Next',
      previousButtonAriaLabel: 'Previous',
      numberButtonAriaLabel: (num) => `Page ${num}`,
    },
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

  it('renders sorting button only when specified in column prop', async () => {
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

  it('does not render the pagination controls when there are fewer rows than the smallest page size', () => {
    const fourRows = rows.slice(0, 4);
    render(<StudioTableRemotePagination columns={columns} rows={fourRows} />);

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
        emptyTableFallback='No rows to display'
      />,
    );
    expect(screen.getByText('No rows to display')).toBeInTheDocument();
  });

  it('formats cells when a valueFormatter is specified', () => {
    const testColumns: Columns = [
      {
        accessor: 'name',
        heading: 'Name',
        valueFormatter: (value) => `Formatted: ${value}`,
      },
    ];
    const testRows: Rows = [{ id: 1, name: 'Sophie Salt' }];

    render(<StudioTableRemotePagination columns={testColumns} rows={testRows} />);

    const formattedNameCell = screen.getByText('Formatted: Sophie Salt');
    expect(formattedNameCell).toBeInTheDocument();

    const unFormattedNameCell = screen.queryByText('Sophie Salt');
    expect(unFormattedNameCell).not.toBeInTheDocument();
  });
});
