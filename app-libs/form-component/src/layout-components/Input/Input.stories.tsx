import { useState } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import { parseAndCleanText } from '@app/form-component/text/parseAndCleanText';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { INPUT_LAYOUT_CONFIG_KEYS, InputLayout } from './Input';
import type { InputLayoutProps } from './Input';

// Controlled wrapper so the playground reflects typing for every variant.
function ControlledInput(args: InputLayoutProps) {
  const [value, setValue] = useState(args.value ?? '');
  return <InputLayout {...args} value={value} onChange={setValue} />;
}

// The story keys mimic text-resource bindings. The provider below resolves them to display strings,
// the same way the app does at runtime via the language context. Any value that isn't a known key is
// passed through and parsed, so you can also type raw HTML or markdown straight into the args (e.g.
// the `description` or `help` controls) and it will render — see the WithHtml/WithMarkdown stories.
const TEXTS: Record<string, string> = {
  'input.title': 'First name',
  'input.description': 'As written in your passport.',
  'input.help': 'We only use your name to personalise the form.',
  'input.prefix': 'Name',
  'input.amount.title': 'Amount',
  'input.amount.suffix': 'kr',
  'input.phone.title': 'Phone number',
  'helptext.button_title_prefix': 'Help for',
  'helptext.button_title': 'Help',
  'form_filler.required_label': '*',
  'general.optional': 'optional',
  'input_components.remaining_characters': '%d characters remaining',
  'input_components.exceeded_max_limit': '%d characters too many',
};

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
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key) => parseAndCleanText(key ? (TEXTS[key] ?? key) : '')}
        langAsString={(key) => (key ? (TEXTS[key] ?? key) : '')}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  render: (args) => <ControlledInput {...args} />,
  args: {
    id: 'input-preview',
    title: 'input.title',
  },
} satisfies Meta<typeof InputLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithDescriptionAndHelp: Story = {
  args: {
    description: 'input.description',
    help: 'input.help',
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
    prefix: 'input.prefix',
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
    title: 'input.amount.title',
    // For the number variant the prefix/suffix come from the resolved number config.
    numberFormat: { thousandSeparator: ' ', suffix: ' kr' },
    value: '1234567',
  },
};

export const PhonePattern: Story = {
  args: {
    title: 'input.phone.title',
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

// The `description` and `help` props are resolved through the language context, which parses the
// text as HTML or markdown. You can therefore put a raw HTML snippet straight into the args.
export const WithHtml: Story = {
  args: {
    description: 'As written in your passport, e.g. <strong>Ada Lovelace</strong>.',
    help: '<p>We only use your name to <em>personalise</em> the form.</p><ul><li>Never shared</li><li>Never stored elsewhere</li></ul>',
  },
};

// …or markdown.
export const WithMarkdown: Story = {
  args: {
    description: 'As written in your passport, e.g. **Ada Lovelace**.',
    help: `We only use your name to _personalise_ the form.

- Never shared
- Never stored elsewhere`,
  },
};
