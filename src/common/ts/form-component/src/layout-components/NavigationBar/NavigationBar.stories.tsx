import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavigationBar } from './NavigationBar';
import type { NavigationBarProps } from './NavigationBar';

export const NAVIGATION_BAR_PROP_CATEGORIES = {
  componentId: 'content',
  pages: 'runtime',
  currentPageId: 'runtime',
  compact: 'content',
  compactMenuOpen: 'runtime',
  onOpenCompactMenu: 'runtime',
  loadingPageId: 'runtime',
  onNavigate: 'runtime',
} satisfies PropCategories<NavigationBarProps>;

const pages = [{ id: 'side1' }, { id: 'side2' }, { id: 'side3' }];

const meta = {
  title: 'LayoutComponents/NavigationBar',
  component: NavigationBar,
  excludeStories: ['NAVIGATION_BAR_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'navigation-bar-preview',
    pages,
    currentPageId: 'side1',
    onNavigate: fn(),
  },
} satisfies Meta<typeof NavigationBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const SecondPageSelected: Story = {
  args: {
    componentId: 'navigation-bar-second',
    currentPageId: 'side2',
  },
};

export const CompactClosed: Story = {
  args: {
    componentId: 'navigation-bar-compact-closed',
    compact: true,
    compactMenuOpen: false,
    onOpenCompactMenu: fn(),
  },
};

export const CompactOpen: Story = {
  args: {
    componentId: 'navigation-bar-compact-open',
    compact: true,
    compactMenuOpen: true,
    onOpenCompactMenu: fn(),
  },
};

export const LoadingPage: Story = {
  args: {
    componentId: 'navigation-bar-loading',
    currentPageId: 'side1',
    loadingPageId: 'side2',
  },
};
