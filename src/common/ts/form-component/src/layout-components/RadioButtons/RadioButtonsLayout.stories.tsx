import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StaticLanguageTranslatorProvider } from '../../test/StaticLanguageTranslatorProvider';
import { RadioButtonsLayout } from './RadioButtonsLayout';
import type { PropCategories } from '../common/storybook';
import type { RadioButtonsLayoutProps } from './RadioButtonsLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by RadioButtonsLayout.mdx.
 */
export const RADIO_BUTTONS_PROP_CATEGORIES = {
  title: 'text',
  help: 'text',
  description: 'text',
  value: 'data',
  componentId: 'content',
  options: 'content',
  readOnly: 'content',
  required: 'content',
  alertOnChange: 'content',
  layout: 'content',
  showAsCard: 'content',
  showOptionalMarking: 'content',
  showLabelsInTable: 'content',
  onChange: 'runtime',
  isValid: 'runtime',
  titlePrefix: 'runtime',
  renderedInTable: 'runtime',
  renderLegend: 'runtime',
  renderLabel: 'runtime',
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<RadioButtonsLayoutProps>;

const land = [
  { value: 'norge', label: 'Norge' },
  { value: 'sverige', label: 'Sverige' },
  {
    value: 'finland',
    label: 'Finland',
    description: 'Republikken Finland',
    helpText: 'Finland ble selvstendig i 1917.',
  },
];

const meta = {
  title: 'LayoutComponents/RadioButtons',
  component: RadioButtonsLayout,
  excludeStories: ['RADIO_BUTTONS_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
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
    componentId: 'radio-buttons-preview',
    options: land,
    value: undefined,
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <RadioButtonsLayout
        {...args}
        onChange={(value) => {
          args.onChange?.(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<typeof RadioButtonsLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Hvor bor du?',
    description: 'Velg landet du bor i nå.',
    help: 'Landet der du er folkeregistrert.',
  },
};

export const Preselected: Story = {
  args: {
    title: 'Hvor bor du?',
    value: 'sverige',
  },
};

export const Horizontal: Story = {
  args: {
    title: 'Hvor bor du?',
    layout: 'row',
  },
};

export const AsCards: Story = {
  args: {
    title: 'Hvor bor du?',
    showAsCard: true,
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Hvor bor du?',
    value: 'norge',
    readOnly: true,
  },
};

export const WithAlertOnChange: Story = {
  args: {
    title: 'Hvor bor du?',
    value: 'norge',
    alertOnChange: true,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Hvor bor du?',
    required: true,
    isValid: false,
    validationMessages: 'Du må velge et land.',
  },
};
