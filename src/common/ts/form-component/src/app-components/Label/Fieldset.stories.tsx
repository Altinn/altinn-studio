import type { Meta, StoryObj } from '@storybook/react-vite';

import { Fieldset } from './Fieldset';

const meta = {
  title: 'AppComponents/Fieldset',
  component: Fieldset,
  args: {
    legend: 'Contact information',
  },
} satisfies Meta<typeof Fieldset>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Required: Story = {
  args: {
    required: true,
    requiredIndicator: <span> *</span>,
  },
};

export const Optional: Story = {
  args: {
    required: false,
    optionalIndicator: <span> (valgfri)</span>,
  },
};

export const WithDescription: Story = {
  args: {
    description: <span>We use this information to contact you about your application.</span>,
  },
};
