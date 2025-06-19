import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDropdownMenu } from './index';

const ComposedComponent = (args): React.ReactElement => (
  <StudioDropdownMenu anchorButtonProps={{ children: args.label }}>
    <StudioDropdownMenu.Group heading='My heading'>
      <StudioDropdownMenu.Item {...args} />
    </StudioDropdownMenu.Group>
  </StudioDropdownMenu>
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
  label: 'My meny label',
  children: 'Item',
  placement: 'bottom-start',
};
export default meta;
