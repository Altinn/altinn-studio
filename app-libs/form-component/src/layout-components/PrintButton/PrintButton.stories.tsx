import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PrintButton } from './PrintButton';
import type { PrintButtonProps } from './PrintButton';

export const PRINT_BUTTON_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  onClick: 'runtime',
  innerGrid: 'runtime',
} satisfies PropCategories<PrintButtonProps>;

const meta = {
  title: 'LayoutComponents/PrintButton',
  component: PrintButton,
  excludeStories: ['PRINT_BUTTON_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'print-button-preview',
    title: 'Skriv ut',
    onClick: () => undefined,
  },
} satisfies Meta<typeof PrintButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const DefaultTextKey: Story = {
  args: {
    title: undefined,
  },
};
