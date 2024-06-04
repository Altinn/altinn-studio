import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';

type Story = StoryFn<typeof StudioTableLocalPagination>;

const meta: Meta = {
  title: 'Studio/StudioTableLocalPagination',
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
    isSortable: {
      description:
        'Boolean that sets sorting to true or false. If set to false, the sorting buttons are hidden.',
    },
    pagination: {
      description:
        'An object containing pagination-related props. If not provided, pagination is hidden.',
    },
  },
};

export const Preview: Story = (args) => (
  <StudioTableLocalPagination
    columns={columns}
    rows={rows}
    size={args.size}
    emptyTableMessage={'No data found'}
    pagination={{
      pageSizeOptions: [5, 10, 20, 50],
      pageSizeLabel: 'Rows per page',
      nextButtonText: 'Next',
      previousButtonText: 'Previous',
      itemLabel: (num) => `Page ${num}`,
    }}
  />
);

export default meta;
