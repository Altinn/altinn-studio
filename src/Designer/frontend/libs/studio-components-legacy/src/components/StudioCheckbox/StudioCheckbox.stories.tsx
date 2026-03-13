import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCheckbox } from './StudioCheckbox';

const meta = {
  title: 'Components/StudioCheckbox',
  component: StudioCheckbox,
  argTypes: {
    children: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    readOnly: {
      control: 'boolean',
    },
    value: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    indeterminate: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof StudioCheckbox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Lorem ipsum',
    description: 'Vestibulum ultrices dignissim dui eu.',
    disabled: false,
    readOnly: false,
    value: 'value',
    size: 'sm',
    indeterminate: false,
  },
};
