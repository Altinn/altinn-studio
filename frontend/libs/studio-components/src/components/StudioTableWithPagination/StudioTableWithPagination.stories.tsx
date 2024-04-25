import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableWithPagination } from './StudioTableWithPagination';
import { columns, rows } from './mockData';

type Story = StoryFn<typeof StudioTableWithPagination>;

const meta: Meta = {
  title: 'Studio/StudioTableWithPagination',
  component: StudioTableWithPagination,
  argTypes: {
    pagination: {
      control: 'radio',
      options: ['true', 'false'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioTableWithPagination {...args} />;

Preview.args = {
  columns: columns,
  rows: rows,
  size: 'medium',
  initialRowsPerPage: 5,
  isSortable: true,
};
export default meta;
