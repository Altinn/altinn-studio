import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSuggestion } from '.';

const meta = {
  title: 'Components/StudioSuggestion',
  component: StudioSuggestion,
} satisfies Meta<typeof StudioSuggestion>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args) => (
    <StudioSuggestion {...args}>
      <StudioSuggestion.Option label='Option 1' value='1'>
        Option 1<div style={{ color: 'gray' }}>Description of option 1</div>
      </StudioSuggestion.Option>
      <StudioSuggestion.Option value='2'>Option 2</StudioSuggestion.Option>
      <StudioSuggestion.Option value='3'>Option 3</StudioSuggestion.Option>
    </StudioSuggestion>
  ),

  args: {
    required: true,
    tagText: 'Required',
    label: 'StudioSuggestion',
    emptyText: 'Empty',
  },
};
