import { withComponentGrid } from '@app/form-component/layout-components/common/storybook';
import { renderWithImmediateArgs } from '@app/storybook/renderWithImmediateArgs';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { StoryArgsProps } from '@app/storybook/renderWithImmediateArgs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextAreaLayout } from './TextAreaLayout';
import type { TextAreaLayoutProps } from './TextAreaLayout';

/**
 * Sorts each prop into a Storybook docs group
 */
export const TEXT_AREA_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  value: 'data',
  componentId: 'content',
  readOnly: 'content',
  required: 'content',
  maxLength: 'content',
  autoComplete: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  onChange: 'runtime',
  onBlur: 'runtime',
  error: 'runtime',
  ariaLabel: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<TextAreaLayoutProps>;

function StatefulTextAreaLayout({ args, updateArgs }: StoryArgsProps<TextAreaLayoutProps>) {
  return (
    <TextAreaLayout
      {...args}
      onChange={(newValue) => {
        args.onChange?.(newValue);
        updateArgs({ value: newValue });
      }}
    />
  );
}

const meta = {
  title: 'LayoutComponents/TextArea',
  component: TextAreaLayout,
  decorators: [withComponentGrid],
  excludeStories: ['TEXT_AREA_PROP_CATEGORIES'],
  parameters: { layout: 'padded' },
  args: {
    componentId: 'textarea-preview',
    value: '',
    onChange: fn(),
    onBlur: fn(),
  },
  render: renderWithImmediateArgs(StatefulTextAreaLayout),
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

/** Label on its own line below `sm` (600px), beside the text area from there. */
export const LabelBeside: Story = {
  args: {
    title: 'Kommentar',
    description: 'Skriv din kommentar her.',
    labelGrid: { xs: 12, sm: 4 },
    innerGrid: { xs: 12, sm: 8 },
  },
};

/** Full width below `md` (1024px), half width from there. */
export const HalfWidth: Story = {
  parameters: { componentGrid: { size: { xs: 12, md: 6 } } },
  args: {
    title: 'Kommentar',
    description: 'Skriv din kommentar her.',
  },
};
