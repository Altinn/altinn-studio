import React, { useEffect, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import type { RemotePaginationProps, PaginationTexts } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';
import { useTableSorting } from '../../../../studio-hooks/src/hooks/useTableSorting';
import { getRowsToRender } from './utils';

type Story = StoryFn<typeof StudioTableRemotePagination>;

const meta: Meta = {
  title: 'Components/StudioTableRemotePagination',
  component: StudioTableRemotePagination,
  argTypes: {
    columns: {
      description: 'An array of objects representing the table columns.',
    },
    rows: {
      description: 'An array of objects representing the table rows.',
    },
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
      description: 'The size of the table.',
    },
    emptyTableMessage: {
      description: 'The message to display when the table is empty.',
    },
    onSortClick: {
      description:
        'Function to be invoked when a sortable column header is clicked. If not provided, sorting buttons are hidden.',
    },
    pagination: {
      description:
        'An object containing pagination-related props. If not provided, pagination is hidden.',
    },
  },
};

export const Preview: Story = (args) => {
  // Example of external logic
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const { handleSorting, sortedRows } = useTableSorting(rows, { enable: true });
  const rowsToRender = getRowsToRender(currentPage, pageSize, sortedRows || rows);

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSize);

  useEffect(() => {
    if (!rowsToRender.length && totalRows) {
      setCurrentPage(1);
    }
  }, [rowsToRender.length, totalRows]);

  const paginationTexts: PaginationTexts = {
    pageSizeLabel: 'Rows per page:',
    totalRowsText: 'Total number of rows:',
    nextButtonAriaLabel: 'Next',
    previousButtonAriaLabel: 'Previous',
    numberButtonAriaLabel: (num) => `Page ${num}`,
  };

  const paginationProps: RemotePaginationProps = {
    currentPage,
    totalPages,
    totalRows,
    pageSize,
    pageSizeOptions: [5, 10, 20, 50],
    onPageChange: setCurrentPage,
    onPageSizeChange: setPageSize,
    paginationTexts,
  };

  return (
    <StudioTableRemotePagination
      columns={columns}
      rows={rowsToRender}
      size={args.size}
      emptyTableFallback={'No data found'}
      onSortClick={handleSorting}
      pagination={paginationProps}
    />
  );
};

export default meta;
