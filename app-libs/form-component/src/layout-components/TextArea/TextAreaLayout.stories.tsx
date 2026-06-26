import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextAreaLayout } from './TextAreaLayout';
import type { TextAreaLayoutProps } from './TextAreaLayout';

/**
 * Sorts each prop into a Storybook docs group
 */
export const TEXT_AREA_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  description: 'text',
  help: 'text',
  // Data model binding — Studio "Datamodeller" section (dataModelBindings.simpleBinding)
  value: 'data',
  // Configurable options — Studio "Innhold" section
  id: 'content',
  componentId: 'content',
  readOnly: 'content',
  required: 'content',
  maxLength: 'content',
  autoComplete: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  onChange: 'runtime',
  onBlur: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<TextAreaLayoutProps>;

const meta = {
  title: 'LayoutComponents/TextArea',
  component: TextAreaLayout,
  // TEXT_AREA_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['TEXT_AREA_PROP_CATEGORIES'],
  parameters: { layout: 'padded' },
  args: {
    id: 'textarea-preview',
    componentId: 'textarea-preview',
    value: '',
    onChange: fn(),
    onBlur: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <TextAreaLayout
        {...args}
        value={value}
        onChange={(newValue) => {
          args.onChange?.(newValue);
          updateArgs({ value: newValue });
        }}
      />
    );
  },
} satisfies Meta<typeof TextAreaLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Kommentar',
    description: 'Skriv din kommentar her.',
    help: 'Hjelp tekst.',
  },
};

export const ReadOnly: Story = {
  args: { value: 'Forhåndsutfylt tekst', readOnly: true, title: 'Kommentar' },
};

export const WithCharacterLimit: Story = {
  args: { maxLength: 100, title: 'Kort kommentar' },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Kommentar',
    validationMessages: 'Du må fylle ut dette feltet.',
  },
};
