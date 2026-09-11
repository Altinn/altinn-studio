import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NavigationBar } from './NavigationBar';

const pages = [{ id: 'side1' }, { id: 'side2' }, { id: 'side3' }];

const render = (
  props?: Partial<ComponentProps<typeof NavigationBar>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <NavigationBar
      componentId='nav-bar-1'
      pages={pages}
      currentPageId='side1'
      onNavigate={() => undefined}
      {...props}
    />,
    options,
  );

describe('NavigationBar', () => {
  it('shows all page buttons on desktop', () => {
    render();
    expect(screen.getByTestId('navigation-menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\. side1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. side2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3\. side3/i })).toBeInTheDocument();
  });

  it('calls onNavigate when a page is pressed', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render({ onNavigate });
    await user.click(screen.getByRole('button', { name: /2\. side2/i }));
    expect(onNavigate).toHaveBeenCalledWith('side2');
  });

  it('shows the compact toggle and hides the menu when compact and closed', () => {
    render({ compact: true, compactMenuOpen: false });
    expect(screen.queryByTestId('navigation-menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\/3 side1/i })).toBeInTheDocument();
  });

  it('calls onOpenCompactMenu when the compact toggle is pressed', async () => {
    const user = userEvent.setup();
    const onOpenCompactMenu = vi.fn();
    render({ compact: true, compactMenuOpen: false, onOpenCompactMenu });
    await user.click(screen.getByRole('button', { name: /1\/3 side1/i }));
    expect(onOpenCompactMenu).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'nav-bar-wrap' });
    expect(document.getElementById('form-content-nav-bar-wrap')).toBeInTheDocument();
  });
});
