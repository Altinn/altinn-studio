import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyHorizontalIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { RoutePaths } from '../../routes/RoutePaths';

export function Menu(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selectedTabId = pathname.split('/').at(-1);
  const menuTabs = [
    {
      tabId: RoutePaths.ApiKeys,
      tabName: t('settings.user.api_keys.api_keys'),
      icon: <KeyHorizontalIcon />,
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
