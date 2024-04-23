import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableWithPagination } from './StudioTableWithPagination';
import { Button } from '@digdir/design-system-react';
import { StarFillIcon } from '@navikt/aksel-icons';

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

const starButton = () => (
  <Button variant={'tertiary'} icon>
    <StarFillIcon />
  </Button>
);

const rows = [
  [starButton(), 'Lila Patel', 'Software Engineer', 'Pending'],
  [starButton(), 'Ethan Nakamura', 'Marketing Specialist', 'Approved'],
  [starButton(), 'Olivia Chen', 'Data Analyst', 'Pending'],
  [starButton(), 'Noah Adebayo', 'UX Designer', 'Approved'],
  [starButton(), 'Sophia Ivanov', 'Product Manager', 'Pending'],
  [starButton(), 'William Torres', 'Sales Representative', 'Approved'],
  [starButton(), 'Ava Gupta', 'Human Resources Manager', 'Pending'],
  [starButton(), 'James Kim', 'Financial Analyst', 'Approved'],
  [starButton(), 'Mia Sánchez', 'Customer Support Specialist', 'Pending'],
];

const columns = ['', 'Name', 'Role', 'Status'];

Preview.args = {
  columns: columns,
  rows: rows,
  size: 'small',
};
export default meta;
