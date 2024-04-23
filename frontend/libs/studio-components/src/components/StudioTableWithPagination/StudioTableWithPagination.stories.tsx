import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTableWithPagination } from './StudioTableWithPagination';
import { Button, Link } from '@digdir/design-system-react';
import { BarChartFillIcon, PersonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

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

const iconButton = (icon) => (
  <Button variant={'tertiary'} icon>
    {icon}
  </Button>
);

const link = () => <Link to={'https://altinn.no'}>Link</Link>;

const rows = [
  [iconButton(<PersonFillIcon />), 'Lila Patel', 'Software Engineer', 'Pending', link()],
  [iconButton(<BarChartFillIcon />), 'Ethan Nakamura', 'Marketing Specialist', 'Approved', link()],
  [iconButton(<BarChartFillIcon />), 'Olivia Chen', 'Data Analyst', 'Pending', link()],
  [iconButton(<PersonFillIcon />), 'Noah Adebayo', 'UX Designer', 'Approved', link()],
  [iconButton(<BarChartFillIcon />), 'Sophia Ivanov', 'Product Manager', 'Pending', link()],
  [iconButton(<PersonFillIcon />), 'William Torres', 'Sales Representative', 'Approved', link()],
  [iconButton(<PersonFillIcon />), 'Ava Gupta', 'Human Resources Manager', 'Pending', link()],
  [iconButton(<PersonFillIcon />), 'James Kim', 'Financial Analyst', 'Approved', link()],
  [
    iconButton(<BarChartFillIcon />),
    'Mia Sánchez',
    'Customer Support Specialist',
    'Pending',
    link(),
  ],
];

const columns = ['', 'Name', 'Role', 'Status', ''];

Preview.args = {
  columns: columns,
  rows: rows,
  size: 'small',
};
export default meta;
