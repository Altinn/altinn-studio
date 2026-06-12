import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './Input';

const meta = {
  title: 'AppComponents/Input',
  component: Input,
  args: {
    label: 'First name',
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithPlaceholder: Story = {
  args: {
    placeholder: 'Type your name',
  },
};

export const WithPrefixAndSuffix: Story = {
  args: {
    label: 'Amount',
    prefix: 'NOK',
    suffix: ',-',
  },
};

export const Search: Story = {
  args: {
    label: 'Search',
    type: 'search',
  },
};

export const WithError: Story = {
  args: {
    error: true,
  },
};

export const ReadOnly: Story = {
  args: {
    value: 'Ada Lovelace',
    readOnly: true,
  },
};

export const TextOnly: Story = {
  args: {
    value: 'Ada Lovelace',
    textonly: true,
  },
};

export const WithCharacterLimit: Story = {
  args: {
    label: 'Short bio',
    characterLimit: {
      limit: 30,
      under: '%d characters remaining',
      over: '%d characters too many',
    },
  },
};
