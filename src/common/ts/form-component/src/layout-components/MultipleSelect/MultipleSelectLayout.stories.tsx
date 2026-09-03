import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { MultipleSelect } from './MultipleSelectLayout';
import type { MultipleSelectProps } from './MultipleSelectLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by MultipleSelectLayout.mdx.
 */
export const MULTIPLE_SELECT_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  help: 'text',
  description: 'text',
  // Data model binding — Studio "Datamodeller" section (dataModelBindings.simpleBinding/group)
  values: 'data',
  // Configurable options — Studio "Innhold" section
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
  isValid: 'runtime',
  renderedInTable: 'runtime',
  renderLabel: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<MultipleSelectProps>;

const spraak = [
  { value: 'norsk', label: 'Norsk' },
  { value: 'svensk', label: 'Svensk' },
  { value: 'dansk', label: 'Dansk' },
  { value: 'finsk', label: 'Finsk', description: 'Offisielt språk i Finland' },
  { value: 'islandsk', label: 'Islandsk' },
];

const meta = {
  title: 'LayoutComponents/MultipleSelect',
  component: MultipleSelect,
  // MULTIPLE_SELECT_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['MULTIPLE_SELECT_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'multiple-select-preview',
    options: spraak,
    values: [],
    onChange: fn(),
  },
  render: function Render(args) {
    const [{ values }, updateArgs] = useArgs();
    return (
      <MultipleSelect
        {...args}
        values={values}
        onChange={(newValues) => {
          args.onChange?.(newValues);
          updateArgs({ values: newValues });
        }}
      />
    );
  },
} satisfies Meta<typeof MultipleSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Språk du snakker',
    description: 'Velg alle språkene du snakker.',
    help: 'Du kan velge flere språk fra listen.',
  },
};

export const Preselected: Story = {
  args: {
    title: 'Språk du snakker',
    values: ['norsk', 'svensk'],
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Språk du snakker',
    values: ['norsk'],
    readOnly: true,
  },
};

export const WithAlertOnChange: Story = {
  args: {
    title: 'Språk du snakker',
    values: ['norsk', 'dansk'],
    alertOnChange: true,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Språk du snakker',
    required: true,
    isValid: false,
    validationMessages: 'Du må velge minst ett språk.',
  },
};
