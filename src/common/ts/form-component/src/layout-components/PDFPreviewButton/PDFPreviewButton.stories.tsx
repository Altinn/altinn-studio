import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PDFPreviewButton } from './PDFPreviewButton';
import type { PDFPreviewButtonProps } from './PDFPreviewButton';

export const PDF_PREVIEW_BUTTON_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  buttonStyle: 'content',
  innerGrid: 'content',
  disabled: 'runtime',
  showErrorDetails: 'runtime',
  onGenerate: 'runtime',
} satisfies PropCategories<PDFPreviewButtonProps>;

const storybookGenerate: PDFPreviewButtonProps['onGenerate'] = async () => ({
  type: 'error',
  message: 'Forhåndsvisning er ikke tilgjengelig i Storybook',
});

const meta = {
  title: 'LayoutComponents/PDFPreviewButton',
  component: PDFPreviewButton,
  excludeStories: ['PDF_PREVIEW_BUTTON_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    buttonStyle: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
  args: {
    componentId: 'pdf-preview-button-preview',
    buttonStyle: 'primary',
    showErrorDetails: true,
    onGenerate: fn(storybookGenerate),
  },
} satisfies Meta<typeof PDFPreviewButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
