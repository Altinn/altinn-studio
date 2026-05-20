import { render, screen } from '@testing-library/react';
import { ContentMenu } from './ContentMenu';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

describe('ContentMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render all menu tabs', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    renderContentMenu();

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
    });
  });

  it('should call setTabToDisplay when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderContentMenu();

    const aboutTab = screen.getByRole('tab', {
      name: textMock('app_settings.left_nav_tab_about'),
    });
    const setupTab = screen.getByRole('tab', {
      name: textMock('app_settings.left_nav_tab_setup'),
    });
    expect(aboutTab).toHaveAttribute('tabindex', '0');
    expect(setupTab).toHaveAttribute('tabindex', '-1');

    await user.click(setupTab);

    expect(aboutTab).toHaveAttribute('tabindex', '-1');
    expect(setupTab).toHaveAttribute('tabindex', '0');
  });
});

const renderContentMenu = () => {
  return render(
    <MemoryRouter initialEntries={[`?currentTab=about`]}>
      <ContentMenu />
    </MemoryRouter>,
  );
};
