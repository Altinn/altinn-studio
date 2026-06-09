import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppTable } from './Table';

type Row = {
  id: number;
  name: string;
  email: string;
  joined: string;
  amount: number;
};

const sampleData: Row[] = [
  { id: 1, name: 'Alice Andersen', email: 'alice@example.com', joined: '2023-10-05', amount: 1200 },
  { id: 2, name: 'Bob Berg', email: 'bob@example.com', joined: '2024-01-12', amount: 250 },
  { id: 3, name: 'Carla Carlsen', email: 'carla@example.com', joined: '2024-08-30', amount: 875 },
];

const sampleColumns = [
  { header: 'Name', accessors: ['name'] },
  { header: 'Email', accessors: ['email'] },
  { header: 'Joined', accessors: ['joined'] },
  { header: 'Amount (kr)', accessors: ['amount'] },
];

const meta = {
  title: 'AppComponents/Table',
  component: AppTable<Row>,
} satisfies Meta<typeof AppTable<Row>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    emptyText: 'No rows to display',
  },
};

export const WithActionButtons: Story = {
  args: {
    ...Preview.args,
    actionButtonHeader: 'Actions',
    actionButtons: [
      {
        onClick: (idx: number) => alert(`Edit row ${idx}`),
        buttonText: 'Edit',
        icon: null,
      },
      {
        onClick: (idx: number) => alert(`Delete row ${idx}`),
        buttonText: 'Delete',
        icon: null,
        color: 'danger',
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    ...Preview.args,
    isLoading: true,
    loadingLabel: 'Loading rows',
  },
};

export const Empty: Story = {
  args: {
    ...Preview.args,
    data: [],
    emptyText: 'No rows yet',
  },
};

export const Mobile: Story = {
  args: {
    ...WithActionButtons.args,
    mobile: true,
  },
};
