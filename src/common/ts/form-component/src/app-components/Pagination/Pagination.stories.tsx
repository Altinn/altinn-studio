import { renderWithImmediateArgs } from '@app/storybook/renderWithImmediateArgs';
import type { StoryArgsProps } from '@app/storybook/renderWithImmediateArgs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from './Pagination';
import type { PaginationProps } from './Pagination';

const Wrapper = ({ args, updateArgs }: StoryArgsProps<PaginationProps>) => (
  <Pagination
    {...args}
    setCurrentPage={(currentPage) => updateArgs({ currentPage })}
    onPageSizeChange={(pageSize) => updateArgs({ pageSize })}
  />
);

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
  render: renderWithImmediateArgs(Wrapper),
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentPage: 1,
  },
};

export const Compact: Story = {
  args: {
    currentPage: 4,
    compact: true,
  },
};

export const HiddenLabels: Story = {
  args: {
    currentPage: 1,
    hideLabels: true,
  },
};

export const WithRowsPerPageDropdown: Story = {
  args: {
    currentPage: 1,
    showRowsPerPageDropdown: true,
  },
};
