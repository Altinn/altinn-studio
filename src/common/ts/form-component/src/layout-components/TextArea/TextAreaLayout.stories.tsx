import { useState } from 'react';

import { ComponentGridItem } from '@app/form-component/app-components/ComponentGridItem';
import { PageRow, withComponentGrid } from '@app/form-component/layout-components/common/storybook';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
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

function StatefulTextAreaLayout({ value: initialValue, onChange, ...args }: TextAreaLayoutProps) {
  const [value, setValue] = useState(initialValue);
  return (
    <TextAreaLayout
      {...args}
      value={value}
      onChange={(newValue) => {
        onChange?.(newValue);
        setValue(newValue);
      }}
    />
  );
}

const meta = {
  title: 'LayoutComponents/TextArea',
  component: TextAreaLayout,
  excludeStories: ['TEXT_AREA_PROP_CATEGORIES'],
  parameters: { layout: 'padded' },
  args: {
    componentId: 'textarea-preview',
    value: '',
    onChange: fn(),
    onBlur: fn(),
  },
  render: (args) => <StatefulTextAreaLayout {...args} />,
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

/** The label beside the text area from `sm`. Switch viewport to see the breakpoints. */
export const LabelBeside: Story = {
  decorators: [withComponentGrid],
  args: {
    title: 'Kommentar',
    description: 'Skriv din kommentar her.',
    labelGrid: { xs: 12, sm: 4 },
    innerGrid: { xs: 12, sm: 8 },
  },
};

/** Two text areas sharing a row from `md`. Switch viewport to see the breakpoints. */
export const TwoInRow: Story = {
  render: (args) => (
    <PageRow>
      <ComponentGridItem size={{ xs: 12, md: 6 }}>
        <StatefulTextAreaLayout
          {...args}
          componentId='textarea-description'
          title='Beskrivelse'
          description='Beskriv saken kort.'
        />
      </ComponentGridItem>
      <ComponentGridItem size={{ xs: 12, md: 6 }}>
        <StatefulTextAreaLayout
          {...args}
          componentId='textarea-comment'
          title='Kommentar'
          description='Skriv din kommentar her.'
        />
      </ComponentGridItem>
    </PageRow>
  ),
};
