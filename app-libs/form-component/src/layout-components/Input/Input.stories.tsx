import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { INPUT_LAYOUT_CONFIG_KEYS, InputLayout } from './Input';
import type { InputLayoutProps } from './Input';

function ControlledInput(args: InputLayoutProps) {
  const [value, setValue] = useState(args.value ?? '');
  return <InputLayout {...args} value={value} onChange={setValue} />;
}

const meta = {
  title: 'LayoutComponents/Input',
  component: InputLayout,
  parameters: {
    layout: 'padded',
    // Only the configurable (Studio-mapped) props get controls; the internal wiring
    // (value, error, validation ids and event handlers) stays hidden and non-editable.
    controls: { include: INPUT_LAYOUT_CONFIG_KEYS },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['text', 'search'] },
    align: { control: 'inline-radio', options: ['left', 'center', 'right'] },
  },
  render: (args) => <ControlledInput {...args} />,
  args: {
    id: 'input-preview',
    title: 'First name',
  },
} satisfies Meta<typeof InputLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithDescriptionAndHelp: Story = {
  args: {
    description: 'As written in your passport.',
    help: 'We only use your name to personalise the form.',
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Optional: Story = {
  args: {
    required: false,
    showOptionalMarking: true,
  },
};

export const WithPrefix: Story = {
  args: {
    prefix: 'Name',
  },
};

export const Search: Story = {
  args: {
    title: 'Search',
    variant: 'search',
  },
};

export const Number: Story = {
  args: {
    title: 'Amount',
    numberFormat: { thousandSeparator: ' ', suffix: ' kr' },
    value: '1234567',
  },
};

export const PhonePattern: Story = {
  args: {
    title: 'Phone number',
    numberFormat: { format: '+47 ### ## ###' },
    value: '44444444',
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    value: 'Ada Lovelace',
  },
};

export const WithError: Story = {
  args: {
    error: true,
  },
};

export const WithCharacterLimit: Story = {
  args: {
    maxLength: 30,
  },
};

export const WithHtml: Story = {
  args: {
    description: 'As written in your passport, e.g. <strong>Ada Lovelace</strong>.',
    help: '<p>We only use your name to <em>personalise</em> the form.</p><ul><li>Never shared</li><li>Never stored elsewhere</li></ul>',
  },
};

export const WithMarkdown: Story = {
  args: {
    description: 'As written in your passport, e.g. **Ada Lovelace**.',
    help: `We only use your name to _personalise_ the form.
            - Never shared
            - Never stored elsewhere`,
  },
};
