import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';
import type { PaginationTexts } from '../StudioTableRemotePagination';

type Story = StoryFn<typeof StudioTableLocalPagination>;

const meta: Meta = {
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
    emptyTableMessage: {
      description: 'The message to display when the table is empty.',
    },
    pagination: {
      description:
        'An object containing pagination-related props. If not provided, pagination is hidden.',
    },
  },
};

export const Preview: Story = (args) => {
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
};

export default meta;
