import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioProfileMenu } from './StudioProfileMenu';
import { StudioAvatar } from '../StudioAvatar';

type Story = StoryFn<typeof StudioProfileMenu>;

const meta: Meta = {
  title: 'Components/StudioProfileMenu',
  component: StudioProfileMenu,
  argTypes: {
    triggerButtonText: {
      control: 'text',
    },
    ariaLabelTriggerButton: {
      control: 'text',
    },
    color: {
      control: 'radio',
      options: ['dark', 'light'],
    },
    variant: {
      control: 'radio',
      options: ['regular', 'preview'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioProfileMenu {...args} />;

Preview.args = {
  triggerButtonText: 'Triggerbutton text',
  ariaLabelTriggerButton: 'Triggerbutton aria-label',
  color: 'dark',
  variant: 'regular',
  profileImage: <StudioAvatar />,
  profileMenuGroups: [
    {
      items: [
        {
          action: { type: 'button', onClick: () => {} },
          itemName: 'Item 1',
        },
        {
          action: { type: 'link', href: '' },
          itemName: 'Item 2',
        },
      ],
    },
    {
      items: [
        {
          action: { type: 'button', onClick: () => {} },
          itemName: 'Item 3',
        },
      ],
    },
  ],
};

export default meta;
