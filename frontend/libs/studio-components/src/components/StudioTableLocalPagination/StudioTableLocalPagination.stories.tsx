import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from '../StudioTableRemotePagination/mockData';

type Story = StoryFn<typeof StudioTableLocalPagination>;

const meta: Meta = {
  title: 'Studio/StudioTableLocalPagination',
  component: StudioTableLocalPagination,
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export const Preview: Story = (args) => (
  <StudioTableLocalPagination
    columns={columns}
    rows={rows}
    size={args.size}
    isSortable={true}
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
