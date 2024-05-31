import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from './utils';

type Story = StoryFn<typeof StudioTableRemotePagination>;

const meta: Meta = {
  title: 'Studio/StudioTableRemotePagination',
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
  const totalPages = Math.ceil(rows.length / pageSize);

  if (!rowsToRender.length && (sortedRows.length || rows.length)) {
    setCurrentPage(1);
  }

  const paginationProps = {
    currentPage,
    totalPages,
    totalRows: rows.length,
    pageSize,
    pageSizeOptions: [5, 10, 20, 50],
    pageSizeLabel: 'Rows per page',
    onPageChange: setCurrentPage,
    onPageSizeChange: setPageSize,
    itemLabel: (num: number) => `Page ${num}`,
    nextButtonText: 'Next',
    previousButtonText: 'Previous',
  };

  return (
    <StudioTableRemotePagination
      columns={columns}
      rows={rowsToRender}
      size={args.size}
      emptyTableMessage={'No data found'}
      onSortClick={handleSorting}
      pagination={paginationProps}
    />
  );
};

export default meta;
