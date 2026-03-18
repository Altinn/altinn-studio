import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFileUploader } from './';

const meta = {
  title: 'Components/StudioFileUploader',
  component: StudioFileUploader,
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
    disabled: {
      control: 'boolean',
    },
    accept: {
      control: 'text',
      type: 'string',
    },
    onSubmit: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof StudioFileUploader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    uploaderButtonText: 'Last opp fil',
    variant: 'tertiary',
    onSubmit: (): void => {},
    disabled: false,
  },
};
