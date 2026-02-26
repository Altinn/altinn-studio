import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFormActions } from './';

const meta: Meta = {
  title: 'Components/StudioFormActions',
  component: StudioFormActions,
  argTypes: {
    primary: {
      disabled: { control: 'boolean' },
      label: { control: 'text' },
    },
  },
};

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    primary: {
      label: 'Save',
      onClick: () => alert('Saved successfully - ordering another round of sake!'),
    },
    secondary: {
      label: 'Cancel',
      onClick: () => alert('Cancel the order - time to say sayonara and head home.'),
    },
  },
};

export default meta;
