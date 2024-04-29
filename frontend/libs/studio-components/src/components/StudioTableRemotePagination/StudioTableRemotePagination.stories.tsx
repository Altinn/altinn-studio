import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableLocalPagination/utils';

type Story = StoryFn<typeof StudioTableRemotePagination>;

const meta: Meta = {
  title: 'Studio/StudioTableRemotePagination',
  component: StudioTableRemotePagination,
  argTypes: {
    pagination: {
      control: 'radio',
      options: ['true', 'false'],
    },
  },
};
export const Preview: Story = (args) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentPageSize, setCurrentPageSize] = useState<number>(2);

  const { handleSorting, sortedRows } = useTableSorting(rows);

  const rowsToRender = getRowsToRender(currentPage, currentPageSize, sortedRows);
  const totalPages = Math.ceil(rows.length / currentPageSize);
  if (rowsToRender.length === 0) setCurrentPage(1);

  const paginationProps = {
    currentPage,
    totalPages,
    pageSize: currentPageSize,
    pageSizeOptions: [2, 5, 10, 20, 50],
    onPageChange: setCurrentPage,
    onPageSizeChange: setCurrentPageSize,
    itemLabel: (num) => `Side ${num}`,
    nextButtonText: 'Neste',
    previousButtonText: 'Forrige',
  };

  return (
    <StudioTableRemotePagination
      columns={columns}
      rows={rowsToRender}
      size='medium'
      onSortClick={handleSorting}
      pagination={paginationProps}
    />
  );
};

export default meta;
