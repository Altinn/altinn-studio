import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioChip } from './';

const meta = {
  title: 'Components/StudioChip',
  component: StudioChip.Button,
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Click me',
  },
};

export const Removable: Story = {
  render: () => <StudioChip.Removable>Click to remove me</StudioChip.Removable>,
};

export const Checkboxes: Story = {
  render: () => (
    <>
      <StudioChip.Checkbox name='language' value='nynorsk'>
        Nynorsk
      </StudioChip.Checkbox>
      <StudioChip.Checkbox name='language' value='bokmål'>
        Bokmål
      </StudioChip.Checkbox>
    </>
  ),
};

export const Radios: Story = {
  render: () => (
    <>
      <StudioChip.Radio name='written-language' value='nynorsk'>
        Nynorsk
      </StudioChip.Radio>
      <StudioChip.Radio name='written-language' value='bokmål'>
        Bokmål
      </StudioChip.Radio>
    </>
  ),
};
