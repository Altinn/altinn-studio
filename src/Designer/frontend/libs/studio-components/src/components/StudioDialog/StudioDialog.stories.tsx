import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDialog } from './index';
import { PencilIcon } from '@studio/icons';
import { StudioHeading } from '../StudioHeading';

const ComposedComponent = (args): ReactElement => (
  <StudioDialog.TriggerContext>
    <StudioDialog.Trigger icon={<PencilIcon />}>My trigger</StudioDialog.Trigger>
    <StudioDialog {...args}>
      <StudioDialog.Block>
        <StudioHeading>My heading</StudioHeading>
      </StudioDialog.Block>
    </StudioDialog>
  </StudioDialog.TriggerContext>
);

const meta = {
  title: 'Components/StudioDialog',
  component: ComposedComponent,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    closedBy: {
      control: 'radio',
      options: ['none', 'closerequest', 'any'],
    },
  },
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    'data-size': 'sm',
    closedBy: 'any',
  },
};
