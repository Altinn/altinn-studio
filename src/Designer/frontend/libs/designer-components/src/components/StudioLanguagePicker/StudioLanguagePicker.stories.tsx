import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLanguagePicker } from './';
import { fn } from 'storybook/test';
import { UncontrolledLanguagePicker } from './test-data/UncontrolledLanguagePicker';
import { defaultProps } from './test-data/props';

const meta: Meta<typeof StudioLanguagePicker> = {
  title: 'Components/StudioLanguagePicker',
  component: StudioLanguagePicker,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Isolated: Story = {
  parameters: {
    layout: 'padded',
  },
  args: {
    ...defaultProps,
    onAdd: fn(),
    onRemove: fn(),
    onSelect: fn(),
  },
};

export const Wrapped: Story = {
  ...Isolated,
  render: UncontrolledLanguagePicker,
};

export const Empty: Story = {
  ...Isolated,
  args: {
    ...Isolated.args,
    languageCodes: [],
  },
};
