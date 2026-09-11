import type { Meta, StoryObj } from '@storybook/react-vite';

import { SoftValidations } from './SoftValidations';

const meta = {
  title: 'AppComponents/SoftValidations',
  component: SoftValidations,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SoftValidations>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Warning: Story = {
  args: {
    severity: 'warning',
    validations: [{ id: '1', message: 'This value looks unusual, please double-check it.' }],
  },
};

export const Info: Story = {
  args: {
    severity: 'info',
    validations: [{ id: '1', message: 'This field is optional.' }],
  },
};

export const Success: Story = {
  args: {
    severity: 'success',
    validations: [{ id: '1', message: 'The value has been verified.' }],
  },
};
