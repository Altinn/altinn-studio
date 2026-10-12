import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen } from '@testing-library/react';
import { AppPreviewSubMenu } from './AppPreviewSubMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/hooks/src/hooks/useMediaQuery';
import { renderWithProviders } from '../../../test/mocks';

vi.mock('@studio/hooks/src/hooks/useMediaQuery');

describe('AppPreviewSubMenu', () => {
  afterEach(() => vi.clearAllMocks());

  it('should render the back-to-editing link with text on large screens', () => {
    (useMediaQuery as Mock).mockReturnValue(false);

    renderAppPreviewSubMenu();

    expect(screen.getByText(textMock('top_menu.preview_back_to_editing'))).toBeInTheDocument();
  });

  it('should render the back-to-editing link without text on small screens', () => {
    (useMediaQuery as Mock).mockReturnValue(true);

    renderAppPreviewSubMenu();

    expect(
      screen.queryByText(textMock('top_menu.preview_back_to_editing')),
    ).not.toBeInTheDocument();
  });

  it('should have the correct aria-label set on the link', () => {
    (useMediaQuery as Mock).mockReturnValue(true);

    renderAppPreviewSubMenu();

    const link = screen.getByRole('link', { name: textMock('top_menu.preview_back_to_editing') });
    expect(link).toHaveAttribute('aria-label', textMock('top_menu.preview_back_to_editing'));
  });
});

const renderAppPreviewSubMenu = () => {
  return renderWithProviders()(<AppPreviewSubMenu />);
};
