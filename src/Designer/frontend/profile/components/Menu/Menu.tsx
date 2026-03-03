import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldLockIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

export function Menu(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let selectedTabId = pathname.split('/').at(-1);
  selectedTabId = selectedTabId === '' ? 'keys' : selectedTabId;
  const menuTabs = [
    {
      tabId: 'keys',
      tabName: t('user.profile.keys.keys'),
      icon: <ShieldLockIcon />,
    },
  ];
  return (
    <StudioContentMenu selectedTabId={selectedTabId} onChangeTab={navigate}>
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
