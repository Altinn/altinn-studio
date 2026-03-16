import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioProperty } from '../index';

const meta = {
  title: 'Components/StudioProperty/Button',
  component: StudioProperty.Button,
  decorators: [
    (Story): ReactElement => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StudioProperty.Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithValue: Story = {
  args: {
    property: 'Contact details',
    value: 'Navn Navnesen, Gateveien 1, 0000 Oslo, Norway',
  },
};

export const Empty: Story = {
  args: {
    property: 'Contact details',
    value: '',
  },
};
