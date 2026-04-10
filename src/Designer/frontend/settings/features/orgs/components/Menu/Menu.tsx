import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldLockIcon, RobotSmileIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { RoutePaths } from '../../routes/RoutePaths';

export function Menu(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selectedTabId = pathname.split('/').at(-1);
  const menuTabs = [
    {
      tabId: RoutePaths.BotAccounts,
      tabName: t('settings.orgs.bot_accounts.menu.bot_accounts'),
      icon: <RobotSmileIcon />,
    },
    {
      tabId: RoutePaths.ContactPoints,
      tabName: t('settings.orgs.contact_points.menu.contact_points'),
      icon: <ShieldLockIcon />,
    },
  ];
  return (
    <StudioContentMenu
      selectedTabId={selectedTabId}
      onChangeTab={(tabId) => navigate({ pathname: tabId })}
    >
      {menuTabs.map((tab) => (
        <StudioContentMenu.ButtonTab
          key={tab.tabId}
          icon={tab.icon}
          tabId={tab.tabId}
          tabName={tab.tabName}
        />
      ))}
    </StudioContentMenu>
  );
}
