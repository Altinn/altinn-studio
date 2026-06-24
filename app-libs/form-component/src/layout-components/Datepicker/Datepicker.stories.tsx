import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Datepicker } from './Datepicker';
import type { DatepickerProps } from './Datepicker';

/**
 * Sorts each prop into a Storybook docs group
 */
export const DATEPICKER_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  help: 'text',
  description: 'text',
  // Data model binding — Studio "Datamodeller" section (dataModelBindings.simpleBinding)
  value: 'data',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  format: 'content',
  minDate: 'content',
  maxDate: 'content',
  timeStamp: 'content',
  readOnly: 'content',
  required: 'content',
  autoComplete: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  onValueChange: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<DatepickerProps>;

const meta = {
  title: 'LayoutComponents/Datepicker',
  component: Datepicker,
  // DATEPICKER_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['DATEPICKER_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'datepicker-preview',
    format: 'dd.MM.yyyy',
    value: '',
    onValueChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Datepicker
        {...args}
        value={value}
        onValueChange={(newValue) => {
          args.onValueChange(newValue);
          updateArgs({ value: newValue });
        }}
      />
    );
  },
} satisfies Meta<typeof Datepicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Fødselsdato',
    description: 'Oppgi datoen du ble født.',
    help: 'Du finner fødselsdatoen din i passet eller på fødselsattesten.',
  },
};

export const ReadOnly: Story = {
  args: {
    value: '2025-03-15',
    readOnly: true,
  },
};

export const WithMinMax: Story = {
  args: {
    minDate: '2025-01-01',
    maxDate: '2025-12-31',
  },
};

export const WithValidationMessages: Story = {
  args: {
    validationMessages: 'You must enter a valid date.',
  },
};
