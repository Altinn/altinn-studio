import React from 'react';
import type { PageName } from '../types/PageName';
import { BookIcon, CodeListsIcon, ImageIcon } from 'libs/studio-icons/src';
import type { StudioContentMenuLinkTabProps } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { pageRouterQueryParamKey } from '../utils/router/QueryParamsRouter';

type TabDictionary = {
  [Key in PageName]: StudioContentMenuLinkTabProps<Key>;
};

export const useContentTabs = (): TabDictionary => {
  const { t } = useTranslation();

  return {
    landingPage: {
      tabName: t('app_content_library.landing_page.page_name'),
      tabId: 'landingPage',
      icon: <BookIcon />,
      renderTab: (props) => <Link to={`?${pageRouterQueryParamKey}=landingPage`} {...props} />,
    },
    codeList: {
      tabName: t('app_content_library.code_lists.page_name'),
      tabId: 'codeList',
      icon: <CodeListsIcon />,
      renderTab: (props) => <Link to={`?${pageRouterQueryParamKey}=codeList`} {...props} />,
    },
    images: {
      tabName: t('app_content_library.images.page_name'),
      tabId: 'images',
      icon: <ImageIcon />,
      renderTab: (props) => <Link to={`?${pageRouterQueryParamKey}=images`} {...props} />,
    },
  };
};
