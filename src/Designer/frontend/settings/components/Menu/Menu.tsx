import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldLockIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

export function Menu(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  let selectedTabId = pathname.split('/').at(-1);
  selectedTabId = selectedTabId === '' ? 'personal-access-tokens' : selectedTabId;
  const menuTabs = [
    {
      tabId: 'personal-access-tokens',
      tabName: t('user.settings.personal_access_tokens.personal_access_tokens'),
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
