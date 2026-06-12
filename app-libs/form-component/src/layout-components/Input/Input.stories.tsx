import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { InputLayout } from './Input';
import type { InputLayoutProps } from './Input';

function ControlledInput(args: InputLayoutProps) {
  const [value, setValue] = useState(args.value ?? '');
  return <InputLayout {...args} value={value} onChange={setValue} />;
}

// Every prop is editable and left ungrouped (no `table.category`), so nothing in the Controls panel
// is collapsible. The Input.mdx docs page separates the configurable and runtime props under real
// markdown headings.
const meta = {
  title: 'LayoutComponents/Input',
  component: InputLayout,
  parameters: {
    layout: 'padded',
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
