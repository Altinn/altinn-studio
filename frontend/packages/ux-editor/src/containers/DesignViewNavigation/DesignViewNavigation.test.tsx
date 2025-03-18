import React from 'react';
import { screen } from '@testing-library/react';
import { DesignViewNavigation } from './DesignViewNavigation';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('DesignViewNavigation', () => {
  it('should render DesignViewNavigation with correct text', () => {
    renderDesignViewNavigation();
    expect(screen.getByText(textMock('ux_editor.side_oppsett_header'))).toBeInTheDocument();
  });

  it('should render menu button with correct title', () => {
    renderDesignViewNavigation();
    const menuButton = screen.getByTitle(textMock('general.options'));
    expect(menuButton).toBeInTheDocument();
  });

  it('should have aria-haspopup attribute set to "menu"', () => {
    renderDesignViewNavigation();
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
  });
});

const renderDesignViewNavigation = () => {
  return renderWithProviders()(<DesignViewNavigation />);
};
