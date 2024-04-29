import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableLocalPagination } from './StudioTableLocalPagination';
import { columns, rows } from './mockData';

type Story = StoryFn<typeof StudioTableLocalPagination>;

const meta: Meta = {
  title: 'Studio/StudioTableLocalPagination',
  component: StudioTableLocalPagination,
  argTypes: {
    pagination: {
      control: 'radio',
      options: ['true', 'false'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => (
  <StudioTableLocalPagination {...args} />
);

Preview.args = {
  columns: columns,
  rows: rows,
  size: 'medium',
  isSortable: true,
  pagination: {
    pageSizeOptions: [5, 10, 20, 50],
    nextButtonText: 'Neste',
    previousButtonText: 'Forrige',
    itemLabel: (num) => `Side ${num}`,
  },
};
export default meta;
