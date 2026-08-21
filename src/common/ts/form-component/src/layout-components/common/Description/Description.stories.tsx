import type { Meta, StoryObj } from '@storybook/react-vite';

import { Description } from './Description';

const meta = {
  title: 'LayoutComponents/Common/Description',
  component: Description,
  args: {
    description: 'En kort beskrivelse som forklarer feltet.',
    componentId: 'example',
  },
} satisfies Meta<typeof Description>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
