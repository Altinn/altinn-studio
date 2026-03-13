import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioPopover } from './';

const meta = {
  title: 'Components/StudioPopover',
  component: StudioPopover,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StudioPopover>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args): ReactElement => (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger>Trigger</StudioPopover.Trigger>
      <StudioPopover {...args}>Content</StudioPopover>
    </StudioPopover.TriggerContext>
  ),

  args: {
    'data-size': 'sm',
  },
};
