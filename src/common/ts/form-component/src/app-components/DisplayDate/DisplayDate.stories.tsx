import type { Meta, StoryObj } from '@storybook/react-vite';

import { DisplayDate } from './DisplayDate';

const meta = {
  title: 'AppComponents/DisplayDate',
  component: DisplayDate,
  args: {
    value: '15.03.2025',
  },
} satisfies Meta<typeof DisplayDate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithIcon: Story = {
  args: {
    iconUrl: 'https://altinncdn.no/orgs/digdir/digdir.png',
    iconAltText: 'Calendar icon',
  },
};

export const WithLabel: Story = {
  args: {
    labelId: 'date-label',
  },
  render: (args) => (
    <>
      <span id='date-label'>Date of birth</span>
      <DisplayDate {...args} />
    </>
  ),
};

export const EmptyValue: Story = {
  args: {
    value: null,
  },
};
