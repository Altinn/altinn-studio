import type { Meta, StoryObj } from '@storybook/react-vite';

import { DisplayNumber } from './DisplayNumber';

const meta = {
  title: 'AppComponents/DisplayNumber',
  component: DisplayNumber,
  args: {
    value: 1234567,
  },
} satisfies Meta<typeof DisplayNumber>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithThousandSeparator: Story = {
  args: {
    formatting: { number: { thousandSeparator: ' ', decimalScale: 2, fixedDecimalScale: true } },
  },
};

export const WithPatternFormat: Story = {
  args: {
    value: 12345678,
    formatting: { number: { format: '### ## ###' } },
  },
};

export const WithIcon: Story = {
  args: {
    iconUrl: 'https://altinncdn.no/orgs/digdir/digdir.png',
    iconAltText: 'Number icon',
  },
};
