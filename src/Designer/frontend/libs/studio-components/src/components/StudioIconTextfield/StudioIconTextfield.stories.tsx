import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyVerticalIcon } from '@studio/icons';
import { StudioIconTextfield } from './StudioIconTextfield';

const meta = {
  title: 'Components/StudioIconTextfield',
  component: StudioIconTextfield,
  parameters: {
    docs: {
      canvas: {
        height: '100%',
      },
    },
  },
} satisfies Meta<typeof StudioIconTextfield>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  args: {
    icon: <KeyVerticalIcon />,
    label: 'A label',
    value: 'A value',
  },
};

export const WithoutIcon: Story = {
  args: {
    label: 'A label',
    value: 'A value',
  },
};

export const WithErrorMessage: Story = {
  args: {
    label: 'A label',
    value: 'A faulty value',
    error: 'Your custom error message!',
  },
};

export const AsReadOnly: Story = {
  args: {
    label: 'A label',
    value: 'A readonly value',
    readOnly: true,
  },
};

export const AsReadOnlyWithIcon: Story = {
  args: {
    icon: <KeyVerticalIcon />,
    label: 'A label',
    value: 'A readonly value',
    readOnly: true,
  },
};

export const AsReadOnlyWithIconAndDescription: Story = {
  args: {
    icon: <KeyVerticalIcon />,
    description: 'A description',
    label: 'A label',
    value: 'A readonly value',
    readOnly: true,
  },
};
