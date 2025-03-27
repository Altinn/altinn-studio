import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioDropdown } from './index';
import { PencilIcon } from '@studio/icons';

const ComposedComponent = (args): React.ReactElement => (
  <StudioDropdown triggerButtonText='My menu label'>
    <StudioDropdown.List>
      <StudioDropdown.Heading>My heading</StudioDropdown.Heading>
      <StudioDropdown.Item>
        <StudioDropdown.Button {...args} />
      </StudioDropdown.Item>
    </StudioDropdown.List>
  </StudioDropdown>
);

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
  title: 'Components/StudioDropdownMenu',
  component: ComposedComponent,
  argTypes: {
    placement: {
      control: 'radio',
      options: ['top', 'right', 'bottom', 'left', 'start', 'end'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  children: 'Item',
  placement: 'bottom-start',
  icon: <PencilIcon />,
};
export default meta;
