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
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
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
      onSortClick={handleSorting}
      pagination={paginationProps}
    />
  );
};

export default meta;
