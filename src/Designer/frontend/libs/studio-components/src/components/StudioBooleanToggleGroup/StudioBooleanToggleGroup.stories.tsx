import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioBooleanToggleGroup } from './StudioBooleanToggleGroup';

const meta = {
  title: 'Components/StudioBooleanToggleGroup',
  component: StudioBooleanToggleGroup,
} satisfies Meta<typeof StudioBooleanToggleGroup>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    value: false,
    trueLabel: 'Yes',
    falseLabel: 'No',
  },
};
