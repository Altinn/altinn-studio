import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from './Pagination';

const meta = {
  title: 'AppComponents/Pagination',
  component: Pagination,
  args: {
    id: 'storybook-pagination',
    nextLabel: 'Next',
    previousLabel: 'Previous',
    rowsPerPageText: 'Rows per page',
    pageAriaLabelTemplate: 'Page {page}',
    size: 'sm',
    numberOfRows: 95,
    pageSize: 10,
    currentPage: 1,
    rowsPerPageOptions: [10, 25, 50],
    setCurrentPage: () => {},
    onPageSizeChange: () => {},
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

const Wrapper = (args: React.ComponentProps<typeof Pagination>) => {
  const [currentPage, setCurrentPage] = useState(args.currentPage ?? 1);
  const [pageSize, setPageSize] = useState(args.pageSize);
  return (
    <Pagination
      {...args}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
    />
  );
};

export const Default: Story = {
  args: {
    currentPage: 1,
  },
  render: (args) => <Wrapper {...args} />,
};

export const Compact: Story = {
  args: {
    currentPage: 4,
    compact: true,
  },
  render: (args) => <Wrapper {...args} />,
};

export const HiddenLabels: Story = {
  args: {
    currentPage: 1,
    hideLabels: true,
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithRowsPerPageDropdown: Story = {
  args: {
    currentPage: 1,
    showRowsPerPageDropdown: true,
  },
  render: (args) => <Wrapper {...args} />,
};
