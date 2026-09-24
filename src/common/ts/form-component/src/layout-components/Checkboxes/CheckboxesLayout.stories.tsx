import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkboxes } from './CheckboxesLayout';
import type { CheckboxesProps } from './CheckboxesLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by CheckboxesLayout.mdx.
 */
export const CHECKBOXES_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  help: 'text',
  description: 'text',
  // Data model binding — Studio "Datamodeller" section (dataModelBindings.simpleBinding)
  value: 'data',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  options: 'content',
  readOnly: 'content',
  required: 'content',
  alertOnChange: 'content',
  layout: 'content',
  showOptionalMarking: 'content',
  showLabelsInTable: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  onChange: 'runtime',
  isValid: 'runtime',
  renderedInTable: 'runtime',
  renderLegend: 'runtime',
  renderLabel: 'runtime',
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<CheckboxesProps>;

const land = [
  { value: 'norge', label: 'Norge' },
  { value: 'sverige', label: 'Sverige' },
  { value: 'danmark', label: 'Danmark' },
  {
    value: 'finland',
    label: 'Finland',
    description: 'Republikken Finland',
    helpText: 'Finland ble selvstendig i 1917.',
  },
  { value: 'island', label: 'Island' },
];

const meta = {
  title: 'LayoutComponents/Checkboxes',
  component: Checkboxes,
  // CHECKBOXES_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['CHECKBOXES_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  // The alert-on-change texts are built-in text resources, so resolve them for the playground. The
  // component's own props are plain strings here, which pass through unchanged.
  decorators: [
    (Story) => (
      <StaticLanguageTranslatorProvider language='nb'>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
  ],
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['column', 'row', 'table'],
    },
  },
  args: {
    componentId: 'checkboxes-preview',
    options: land,
    value: [],
    onChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Checkboxes
        {...args}
        value={value}
        onChange={(optionValue, checked) => {
          args.onChange?.(optionValue, checked);
          updateArgs({
            value: checked
              ? [...value, optionValue]
              : value.filter((selected: string) => selected !== optionValue),
          });
        }}
      />
    );
  },
} satisfies Meta<typeof Checkboxes>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    description: 'Du kan velge flere land.',
    help: 'Ta med land du har bodd i i mer enn seks måneder.',
  },
};

export const Preselected: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    value: ['norge', 'danmark'],
  },
};

export const Horizontal: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    options: land.slice(0, 3),
    layout: 'row',
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    value: ['sverige'],
    readOnly: true,
  },
};

export const WithAlertOnChange: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    value: ['norge'],
    alertOnChange: true,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Hvilke land har du bodd i?',
    required: true,
    isValid: false,
    validationMessages: 'Du må velge minst ett land.',
  },
};
