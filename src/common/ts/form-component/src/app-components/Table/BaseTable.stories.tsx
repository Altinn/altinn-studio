import type { Meta, StoryObj } from '@storybook/react-vite';

import { BaseTable } from './BaseTable';

const rows = [
  { name: 'Alice Andersen', city: 'Oslo' },
  { name: 'Bob Berg', city: 'Bergen' },
  { name: 'Carla Carlsen', city: 'Tromsø' },
];

const meta = {
  title: 'AppComponents/BaseTable',
  component: BaseTable,
  render: (args) => (
    <BaseTable {...args}>
      <BaseTable.Head>
        <BaseTable.Row>
          <BaseTable.HeaderCell>Name</BaseTable.HeaderCell>
          <BaseTable.HeaderCell>City</BaseTable.HeaderCell>
        </BaseTable.Row>
      </BaseTable.Head>
      <BaseTable.Body>
        {rows.map((row) => (
          <BaseTable.Row key={row.name}>
            <BaseTable.Cell>{row.name}</BaseTable.Cell>
            <BaseTable.Cell>{row.city}</BaseTable.Cell>
          </BaseTable.Row>
        ))}
      </BaseTable.Body>
    </BaseTable>
  ),
} satisfies Meta<typeof BaseTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesignsystemDefault: Story = {};

export const GrayHeader: Story = {
  args: {
    headerBackground: 'gray',
    headerDivider: 'light',
    headerPadding: 'large',
    rowDivider: 'light',
    cellPadding: 'medium',
  },
};

export const BorderedWithShadow: Story = {
  args: {
    border: true,
    shadow: true,
    headerBackground: 'tinted',
    headerDivider: 'light',
    headerPadding: 'medium',
    rowDivider: 'light',
    cellPadding: 'large',
  },
};
