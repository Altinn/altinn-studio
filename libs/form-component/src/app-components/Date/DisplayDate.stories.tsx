import type { Meta, StoryObj } from '@storybook/react-vite';

import { DisplayDate } from './DisplayDate';

const meta = {
  title: 'AppComponents/DisplayDate',
  component: DisplayDate,
} satisfies Meta<typeof DisplayDate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    value: '15.03.2025',
  },
};

export const WithIcon: Story = {
  args: {
    value: '15.03.2025',
    iconUrl: 'https://altinncdn.no/orgs/digdir/digdir.png',
    iconAltText: 'Calendar icon',
  },
};
