import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import type {
  RemotePaginationProps,
  Columns,
  Rows,
  PaginationTexts,
} from './StudioTableRemotePagination';
import { columns, emptyTableFallback, paginationTexts, rows } from './mockData';

describe('StudioTableRemotePagination', () => {
  const paginationProps: RemotePaginationProps = {
    currentPage: 1,
    totalPages: 4,
    totalRows: rows.length,
    pageSize: 5,
    pageSizeOptions: [5, 10, 20, 50],
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    paginationTexts,
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

    expect(
      screen.getByRole('combobox', { name: paginationTexts.pageSizeLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: paginationTexts.nextButtonAriaLabel }),
    ).toBeInTheDocument();
  });

  it('does not render the pagination controls when pagination prop is not provided', () => {
    render(<StudioTableRemotePagination columns={columns} rows={rows} />);

    expect(
      screen.queryByRole('combobox', { name: paginationTexts.pageSizeLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: paginationTexts.nextButtonAriaLabel }),
    ).not.toBeInTheDocument();
  });

  it('does not render the pagination controls when there are fewer rows than the smallest page size', () => {
    const fourRows = rows.slice(0, 4);
    render(<StudioTableRemotePagination columns={columns} rows={fourRows} />);

    expect(
      screen.queryByRole('combobox', { name: paginationTexts.pageSizeLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: paginationTexts.nextButtonAriaLabel }),
    ).not.toBeInTheDocument();
  });

  it('triggers the onPageChange function when "Next" is clicked', async () => {
    render(
      <StudioTableRemotePagination columns={columns} rows={rows} pagination={paginationProps} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: paginationTexts.nextButtonAriaLabel }));

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

    await user.selectOptions(
      screen.getByRole('combobox', { name: paginationTexts.pageSizeLabel }),
      '10',
    );

    expect(paginationProps.onPageSizeChange).toHaveBeenCalledWith(10);
  });

  it('displays the empty table message when there are no rows to display', () => {
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={[]}
        emptyTableFallback={emptyTableFallback}
      />,
    );
    expect(screen.getByText(emptyTableFallback)).toBeInTheDocument();
  });

  it('formats cells when a valueFormatter is specified', () => {
    const testColumns: Columns = [
      {
        accessor: 'name',
        heading: 'Name',
        bodyCellFormatter: (value) => `Formatted: ${value}`,
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

describe('StudioTableRemotePagination - StudioPagination defaults', () => {
  const basePagination: RemotePaginationProps = {
    currentPage: 2,
    totalPages: 4,
    totalRows: rows.length,
    pageSize: 5,
    pageSizeOptions: [5, 10, 20, 50],
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    paginationTexts,
  };

  it('uses default Previous/Next aria-labels when paginationTexts is undefined', async () => {
    const onPageChange = jest.fn();
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={rows}
        pagination={{
          ...basePagination,
          onPageChange,
          paginationTexts: undefined as unknown as PaginationTexts,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('falls back to current page 1 when currentPage is falsy (0)', () => {
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={rows}
        pagination={{
          ...basePagination,
          currentPage: 0 as unknown as number,
          totalPages: 2,
          paginationTexts: undefined as unknown as PaginationTexts,
        }}
      />,
    );
    const pageOneButton = screen.getByRole('button', { name: '1' });
    expect(pageOneButton).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('listitem', { hidden: true }).length).toBeGreaterThan(0);
  });

  it('does not set aria-label on number buttons when numberButtonAriaLabel is undefined', () => {
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={rows}
        pagination={{
          ...basePagination,
          paginationTexts: {
            ...paginationTexts,
            numberButtonAriaLabel: undefined as unknown as (num: number) => string,
          },
        }}
      />,
    );
    const pageTwo = screen.getByRole('button', { name: '2' });
    expect(pageTwo).not.toHaveAttribute('aria-label');
  });

  it('triggers the onPageChange function when "Previous" is clicked', async () => {
    const onPageChange = jest.fn();
    render(
      <StudioTableRemotePagination
        columns={columns}
        rows={rows}
        pagination={{ ...basePagination, onPageChange }}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
