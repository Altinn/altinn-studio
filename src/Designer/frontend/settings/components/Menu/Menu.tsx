import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldLockIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { RoutePaths } from '../../routes/RoutePaths';

export function Menu(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  let selectedTabId = pathname.split('/').at(-1);
  selectedTabId = selectedTabId === '' ? RoutePaths.ApiKeys : selectedTabId;
  const menuTabs = [
    {
      tabId: RoutePaths.ApiKeys,
      tabName: t('user.settings.api_keys.api_keys'),
      icon: <ShieldLockIcon />,
    },
  ];
  return (
    <StudioContentMenu
      selectedTabId={selectedTabId}
      onChangeTab={(tabId) => navigate({ pathname: tabId, search })}
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
