import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFormActions } from './';
import { PrimaryActionMode, SecondaryActionMode } from './StudioFormActionsUtils';

const meta: Meta = {
  title: 'Components/StudioFormActions',
  component: StudioFormActions,
  argTypes: {
    primaryMode: {
      control: { type: 'select' },
      options: Object.values(PrimaryActionMode),
    },
    secondaryMode: {
      control: { type: 'select' },
      options: Object.values(SecondaryActionMode),
    },
  },
};

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    primaryText: 'Save',
    secondaryText: 'Cancel',
    onPrimaryAction: () =>
      alert('Primary action performed - ordering another round of sake at your favorite izakaya!'),
    onSecondaryAction: () =>
      alert('Secondary action performed - time to say sayonara and head home.'),
    isLoading: false,
    disabled: false,
    primaryMode: PrimaryActionMode.Save,
    secondaryMode: SecondaryActionMode.Cancel,
  },
};

export default meta;
