import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCombobox } from './index';

const meta = {
  title: 'Components/StudioCombobox',
  component: StudioCombobox,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    multiple: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof StudioCombobox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args) => {
    return (
      <StudioCombobox {...args}>
        <StudioCombobox.Empty>Empty</StudioCombobox.Empty>
        <StudioCombobox.Option value='1'>Ole</StudioCombobox.Option>
        <StudioCombobox.Option value='2'>Dole</StudioCombobox.Option>
        <StudioCombobox.Option value='3'>Doffen</StudioCombobox.Option>
      </StudioCombobox>
    );
  },

  args: {
    label: 'Label',
    description: 'This is a description',
    size: 'sm',
    multiple: true,
  },
};
