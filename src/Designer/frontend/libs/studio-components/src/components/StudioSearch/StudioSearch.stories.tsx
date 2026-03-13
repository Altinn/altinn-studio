import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSearch } from './StudioSearch';

const meta = {
  title: 'Components/StudioSearch',
  component: StudioSearch,
  argTypes: {
    label: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
    clearButtonLabel: {
      control: 'text',
    },
    id: {
      control: 'text',
    },
    className: {
      control: 'text',
    },
  },
} satisfies Meta<typeof StudioSearch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'Search',
    clearButtonLabel: 'Clear search',
  },
};
