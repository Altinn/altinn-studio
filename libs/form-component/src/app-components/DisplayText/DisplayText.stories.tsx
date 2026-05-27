import type { Meta, StoryObj } from '@storybook/react-vite';

import { DisplayText } from './DisplayText';

const meta = {
  title: 'AppComponents/DisplayText',
  component: DisplayText,
  args: {
    value: 'Hello world',
  },
} satisfies Meta<typeof DisplayText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithIcon: Story = {
  args: {
    iconUrl: 'https://altinncdn.no/orgs/digdir/digdir.png',
    iconAltText: 'Info icon',
  },
};

export const WithLabel: Story = {
  args: {
    labelId: 'text-label',
  },
  render: (args) => (
    <>
      <span id='text-label'>Description</span>
      <DisplayText {...args} />
    </>
  ),
};

export const EmptyValue: Story = {
  args: {
    value: '',
  },
};
