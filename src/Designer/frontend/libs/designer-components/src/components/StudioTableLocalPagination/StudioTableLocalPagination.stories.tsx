import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';
import type { PaginationTexts } from '../StudioTableRemotePagination';

const meta = {
  title: 'Components/StudioTableLocalPagination',
  component: StudioTableLocalPagination,
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
    pagination: {
      description:
        'An object containing pagination-related props. If not provided, pagination is hidden.',
    },
  },
} satisfies Meta<typeof StudioTableLocalPagination>;
export default meta;

type Story = StoryObj<typeof StudioTableLocalPagination>;

export const Preview: Story = {
  render: (args) => {
    const paginationTexts: PaginationTexts = {
      pageSizeLabel: 'Rows per page:',
      totalRowsText: 'Total number of rows:',
      nextButtonAriaLabel: 'Next',
      previousButtonAriaLabel: 'Previous',
      numberButtonAriaLabel: (num) => `Page ${num}`,
    };

    return (
      <StudioTableLocalPagination
        columns={columns}
        rows={rows}
        size={args.size}
        emptyTableFallback={'No data found'}
        pagination={{
          pageSizeOptions: [5, 10, 20, 50],
          paginationTexts,
        }}
      />
    );
  },
};
