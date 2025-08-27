import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDialog } from './index';
import { PencilIcon } from '../../../../studio-icons';
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

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
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
};
export const Preview: Story = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  'data-size': 'sm',
  closedBy: 'any',
};
export default meta;
