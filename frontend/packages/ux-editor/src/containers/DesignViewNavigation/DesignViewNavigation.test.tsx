import React from 'react';
import { screen } from '@testing-library/react';
import { DesignViewNavigation } from './DesignViewNavigation';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('DesignViewNavigation', () => {
  it('should render DesignViewNavigation with correct text', () => {
    renderDesignViewNavigation();
    expect(screen.getByText(textMock('ux_editor.page_layout_header'))).toBeInTheDocument();
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

  it('should open dropdown menu when clicking the menu button', async () => {
    const user = userEvent.setup();
    renderDesignViewNavigation();
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    expect(
      screen.queryByText(textMock('ux_editor.page_layout_perfom_another_task')),
    ).not.toBeInTheDocument();
    await user.click(menuButton);

    expect(
      await screen.findByText(textMock('ux_editor.page_layout_perfom_another_task')),
    ).toBeInTheDocument();
  });

  it('should close dropdown menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderDesignViewNavigation();
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);
    expect(
      screen.getByText(textMock('ux_editor.page_layout_perfom_another_task')),
    ).toBeInTheDocument();
    await user.click(document.body);

    expect(
      screen.queryByText(textMock('ux_editor.page_layout_perfom_another_task')),
    ).not.toBeInTheDocument();
  });
});

const renderDesignViewNavigation = () => {
  return renderWithProviders()(<DesignViewNavigation />);
};
