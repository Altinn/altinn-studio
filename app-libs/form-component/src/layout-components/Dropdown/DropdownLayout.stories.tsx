import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Dropdown } from './DropdownLayout';
import type { DropdownProps } from './DropdownLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by DropdownLayout.mdx.
 */
export const DROPDOWN_PROP_CATEGORIES = {
  // Text resources — Studio's text section (textResourceBindings)
  title: 'text',
  help: 'text',
  description: 'text',
  // Data model binding — Studio "Datamodeller" section (dataModelBindings.simpleBinding)
  value: 'data',
  // Configurable options — Studio's content section
  componentId: 'content',
  options: 'content',
  readOnly: 'content',
  required: 'content',
  alertOnChange: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  onChange: 'runtime',
  onBlur: 'runtime',
  isValid: 'runtime',
  renderedInTable: 'runtime',
  renderLabel: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<DropdownProps>;

const land = [
  { value: 'norge', label: 'Norge' },
  { value: 'sverige', label: 'Sverige' },
  { value: 'danmark', label: 'Danmark' },
  { value: 'finland', label: 'Finland', description: 'Republikken Finland' },
  { value: 'island', label: 'Island' },
];

const meta = {
  title: 'LayoutComponents/Dropdown',
  component: Dropdown,
  // DROPDOWN_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['DROPDOWN_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'dropdown-preview',
    options: land,
    value: '',
    onChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Dropdown
        {...args}
        value={value}
        onChange={(newValue) => {
          args.onChange?.(newValue);
          updateArgs({ value: newValue });
        }}
      />
    );
  },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Bostedsland',
    description: 'Velg landet du bor i.',
    help: 'Oppgi landet der du har fast bopel.',
  },
};

export const Preselected: Story = {
  args: {
    title: 'Bostedsland',
    value: 'norge',
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Bostedsland',
    value: 'sverige',
    readOnly: true,
  },
};

export const WithAlertOnChange: Story = {
  args: {
    title: 'Bostedsland',
    value: 'norge',
    alertOnChange: true,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Bostedsland',
    required: true,
    isValid: false,
    validationMessages: 'Du må fylle ut bostedsland.',
  },
};
