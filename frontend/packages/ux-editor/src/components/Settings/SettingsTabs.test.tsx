import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/mocks';
import { SettingsTabs } from './SettingsTabs';
import { typedLocalStorage } from '@studio/pure-functions';

describe('SettingsTabs', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render component and select Navigation as default tab', () => {
    renderSettingsTabs();

    const navigationTab = screen.getByRole('tab', {
      name: textMock('ux_editor.settings.navigation_tab'),
    });
    expect(navigationTab).toBeInTheDocument();
    expect(navigationTab).toHaveAttribute('aria-selected', 'true');

    const dataModelTab = screen.getByRole('tab', {
      name: textMock('ux_editor.settings.data_model_tab'),
    });
    expect(dataModelTab).toBeInTheDocument();
  });

  it('should switch to Navigation tab when clicking Navigation tab', async () => {
    const user = userEvent.setup();
    renderSettingsTabs();

    const navigationTab = screen.getByRole('tab', {
      name: textMock('ux_editor.settings.navigation_tab'),
    });
    await user.click(navigationTab);

    expect(navigationTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch to Data model tab when clicking Data model tab', async () => {
    const user = userEvent.setup();
    renderSettingsTabs();

    const dataModelTab = screen.getByRole('tab', {
      name: textMock('ux_editor.settings.data_model_tab'),
    });
    await user.click(dataModelTab);

    expect(dataModelTab).toHaveAttribute('aria-selected', 'true');
  });
});

const renderSettingsTabs = () => {
  return renderWithProviders(<SettingsTabs />);
};
