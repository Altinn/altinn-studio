import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { DROPDOWN_LAYOUT_CONFIG_KEYS, DropdownLayout } from './Dropdown';
import type { DropdownLayoutProps, DropdownOption } from './Dropdown';

// Controlled wrapper so the playground reflects selecting an option.
function ControlledDropdown(args: DropdownLayoutProps) {
  const [value, setValue] = useState(args.value);
  return <DropdownLayout {...args} value={value} onChange={setValue} />;
}

// The story keys mimic text-resource bindings. The provider below resolves them to display strings,
// the same way the app does at runtime via the language context.
const TEXTS: Record<string, string> = {
  'dropdown.title': 'Country',
  'dropdown.description': 'Select the country you live in.',
  'dropdown.help': 'We use this to show the right form.',
  'country.norway': 'Norway',
  'country.sweden': 'Sweden',
  'country.denmark': 'Denmark',
  'country.norway.description': 'Kingdom of Norway',
  helptext_button_title_prefix: 'Help for',
  'helptext.button_title_prefix': 'Help for',
  'helptext.button_title': 'Help',
  'form_filler.required_label': '*',
  'general.optional': 'optional',
  'general.loading': 'Loading…',
  'general.cancel': 'Cancel',
  'form_filler.alert_confirm': 'Confirm',
  'form_filler.no_options_found': 'No options found',
  'form_filler.dropdown_alert': 'Are you sure you want to change to %s?',
};

const OPTIONS: DropdownOption[] = [
  { value: 'norway', label: 'country.norway', description: 'country.norway.description' },
  { value: 'sweden', label: 'country.sweden' },
  { value: 'denmark', label: 'country.denmark' },
];

const meta = {
  title: 'LayoutComponents/Dropdown',
  component: DropdownLayout,
  parameters: {
    layout: 'padded',
    // Only the configurable (Studio-mapped) props get controls; the internal wiring
    // (options, value, error, loading and event handlers) stays hidden and non-editable.
    controls: { include: DROPDOWN_LAYOUT_CONFIG_KEYS },
  },
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key, params) => {
          const text = key ? (TEXTS[key] ?? key) : null;
          return typeof text === 'string' && params
            ? params.reduce<string>((acc, p) => acc.replace('%s', String(p ?? '')), text)
            : text;
        }}
        translate={(key) => TEXTS[key] ?? key}
        TranslateComponent={({ tKey }) => TEXTS[tKey] ?? tKey}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  render: (args) => <ControlledDropdown {...args} />,
  args: {
    id: 'dropdown-preview',
    title: 'dropdown.title',
    options: OPTIONS,
  },
} satisfies Meta<typeof DropdownLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithDescriptionAndHelp: Story = {
  args: {
    description: 'dropdown.description',
    help: 'dropdown.help',
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

export const Preselected: Story = {
  args: {
    value: 'sweden',
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    value: 'norway',
  },
};

export const WithError: Story = {
  args: {
    error: true,
  },
};

export const AlertOnChange: Story = {
  args: {
    alertOnChange: true,
    value: 'norway',
  },
};
