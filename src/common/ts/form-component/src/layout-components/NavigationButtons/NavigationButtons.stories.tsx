import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavigationButtons } from './NavigationButtons';
import type { NavigationButtonsProps } from './NavigationButtons';

export const NAVIGATION_BUTTONS_PROP_CATEGORIES = {
  next: 'text',
  back: 'text',
  backToSummary: 'text',
  backToPage: 'text',
  componentId: 'content',
  showNext: 'runtime',
  showPrevious: 'runtime',
  showBackToSummary: 'runtime',
  showBackToPage: 'runtime',
  backToPageParams: 'runtime',
  disabled: 'runtime',
  nextDisabled: 'runtime',
  loadingKey: 'runtime',
  onClickNext: 'runtime',
  onClickPrevious: 'runtime',
  onClickBackToSummary: 'runtime',
  onClickBackToPage: 'runtime',
} satisfies PropCategories<NavigationButtonsProps>;

const meta = {
  title: 'LayoutComponents/NavigationButtons',
  component: NavigationButtons,
  excludeStories: ['NAVIGATION_BUTTONS_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'navigation-buttons-preview',
    showNext: true,
    showPrevious: true,
    onClickNext: fn(),
    onClickPrevious: fn(),
    onClickBackToSummary: fn(),
    onClickBackToPage: fn(),
  },
} satisfies Meta<typeof NavigationButtons>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const NextOnly: Story = {
  args: {
    showPrevious: false,
  },
};

export const WithBackToSummary: Story = {
  args: {
    showBackToSummary: true,
    showNext: true,
    showPrevious: true,
  },
};

export const LoadingNext: Story = {
  args: {
    loadingKey: 'next',
  },
};

export const CustomText: Story = {
  args: {
    next: 'Gå videre',
    back: 'Gå tilbake',
  },
};
