import type { Meta, StoryObj } from '@storybook/react-vite';

import { DemoLayoutComponent } from './DemoLayoutComponent';

const meta = {
  title: 'LayoutComponents/DemoLayoutComponent',
  component: DemoLayoutComponent,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DemoLayoutComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
