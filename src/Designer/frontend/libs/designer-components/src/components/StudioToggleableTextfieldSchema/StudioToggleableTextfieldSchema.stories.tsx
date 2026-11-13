import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioToggleableTextfieldSchema } from './StudioToggleableTextfieldSchema';

const meta = {
  title: 'Components/StudioToggleableTextfieldSchema',
  component: StudioToggleableTextfieldSchema,
} satisfies Meta<typeof StudioToggleableTextfieldSchema>;
export default meta;

type Story = StoryObj<typeof StudioToggleableTextfieldSchema>;

export const Preview: Story = {
  args: {
    label: 'My awesome label',
    value: 'value',
    error: '',
  },
};
