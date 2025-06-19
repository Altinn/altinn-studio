import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioProperty } from '../index';

type Story = StoryFn<typeof StudioProperty.Button>;

const meta: Meta = {
  title: 'Components/StudioProperty/Button',
  component: StudioProperty.Button,
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithValue: Story = (args): React.ReactElement => <StudioProperty.Button {...args} />;

WithValue.args = {
  property: 'Contact details',
  value: 'Navn Navnesen, Gateveien 1, 0000 Oslo, Norway',
};

export const Empty: Story = (args): React.ReactElement => <StudioProperty.Button {...args} />;

Empty.args = {
  property: 'Contact details',
  value: '',
};

export default meta;
