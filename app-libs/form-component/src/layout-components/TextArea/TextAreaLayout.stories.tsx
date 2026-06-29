import { useState } from 'react';

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
  validationMessages: 'runtime',
} satisfies PropCategories<TextAreaLayoutProps>;

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
  render: function Render({ value: initialValue, onChange, ...args }) {
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
