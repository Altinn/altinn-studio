import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioToggleableTextfield } from './StudioToggleableTextfield';

const meta = {
  title: 'Components/StudioToggleableTextfield',
  component: StudioToggleableTextfield,
} satisfies Meta<typeof StudioToggleableTextfield>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args) => <StudioToggleableTextfield {...args}></StudioToggleableTextfield>,

  args: {
    onIsViewMode: (): void => {},
    label: 'My awesome label',
    value: 'value',
    error: 'error',
  },
};
