import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioNativeSelect } from './StudioNativeSelect';

const meta = {
  title: 'Components/StudioNativeSelect',
  component: StudioNativeSelect,
  argTypes: {
    size: {
      control: 'radio',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
  },
} satisfies Meta<typeof StudioNativeSelect>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args): React.ReactElement => (
    <StudioNativeSelect {...args}>
      <option value='1'>Option 1</option>
      <option value='2'>Option 2</option>
      <option value='3'>Option 3</option>
    </StudioNativeSelect>
  ),

  args: {
    label: 'Label',
    description: 'This is a description',
    size: 'medium',
  },
};
