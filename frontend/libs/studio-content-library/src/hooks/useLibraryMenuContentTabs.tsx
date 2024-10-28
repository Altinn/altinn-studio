import React from 'react';
import type { PageName } from '../types/PageName';
import { BookIcon, CodeListsIcon, ImageIcon } from '@studio/icons';
import type { StudioMenuTabType } from '@studio/components';
import { useTranslation } from 'react-i18next';

type useContentTabsReturnType = {
  getContentTabs: () => StudioMenuTabType<PageName>[];
};

export const useContentTabs = (): useContentTabsReturnType => {
  const { t } = useTranslation();
  const getContentTabs = (): StudioMenuTabType<PageName>[] => [
    {
      tabName: t('app_content_library.landing_page.page_name'),
      tabId: 'landingPage',
      icon: <BookIcon />,
      to: '',
    },
    {
      icon: <CodeListsIcon />,
      tabId: 'codeList',
      tabName: t('app_content_library.code_lists.page_name'),
      to: '',
    },
    {
      icon: <ImageIcon />,
      tabId: 'images',
      tabName: t('app_content_library.images.page_name'),
      to: '',
    },
  ];

  return { getContentTabs };
};
