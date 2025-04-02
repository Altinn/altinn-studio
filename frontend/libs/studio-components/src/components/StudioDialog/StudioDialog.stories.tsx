import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioDialog } from './index';
import { PencilIcon } from '@studio/icons';
import { StudioHeading } from '../StudioHeading';

const ComposedComponent = (args): ReactElement => (
  <StudioDialog triggerButtonText='My dialog trigger'>
    <StudioDialog.Block>
      <StudioHeading>My heading</StudioHeading>
    </StudioDialog.Block>
  </StudioDialog>
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
  },
};
export const Preview: Story = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  triggerButtonIcon: <PencilIcon />,
};
export default meta;
