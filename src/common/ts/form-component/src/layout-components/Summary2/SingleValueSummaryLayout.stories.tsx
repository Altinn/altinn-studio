import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SingleValueSummaryLayout } from './SingleValueSummaryLayout';
import { SummaryEditButton } from './SummaryEditButton';
import type { SingleValueSummaryLayoutProps } from './SingleValueSummaryLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by SingleValueSummaryLayout.mdx. The texts belong
 * to the summarised component, and the rest comes from the Summary2 component's settings or the runtime.
 */
export const SINGLE_VALUE_SUMMARY_PROP_CATEGORIES = {
  // Text resources of the summarised component
  title: 'text',
  description: 'text',
  help: 'text',
  // Data — the summarised value
  value: 'data',
  // Summary2 settings — Studio "Innhold" section
  emptyFieldText: 'content',
  compact: 'content',
  // Injected by the runtime wrapper
  multiline: 'runtime',
  hasErrors: 'runtime',
  showLabelMetadata: 'runtime',
  editButton: 'runtime',
  renderLabel: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<SingleValueSummaryLayoutProps>;

const meta = {
  title: 'LayoutComponents/Summary2/SingleValueSummary',
  component: SingleValueSummaryLayout,
  excludeStories: ['SINGLE_VALUE_SUMMARY_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  // The empty text and the edit button use built-in text resources, so resolve them for the playground.
  decorators: [
    (Story) => (
      <StaticLanguageTranslatorProvider language='nb'>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
  ],
  args: {
    title: 'Fornavn',
    value: 'Kari',
    editButton: <SummaryEditButton onClick={fn()} title='Fornavn' />,
  },
} satisfies Meta<typeof SingleValueSummaryLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    description: 'Slik det står i folkeregisteret.',
    help: 'Skriv alle fornavnene dine.',
  },
};

export const Empty: Story = {
  args: {
    value: undefined,
  },
};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const WithErrors: Story = {
  args: {
    hasErrors: true,
    validationMessages: 'Du må fylle ut fornavn.',
  },
};
