import React from 'react';
import { PageName } from '../types/PageName';
import { BookIcon, CodeListsIcon, ImageIcon } from '@studio/icons';
import type { StudioContentMenuLinkTabProps } from '@studio/components';
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
      tabId: PageName.LandingPage,
      icon: <BookIcon />,
      renderTab: (props) => (
        <Link to={`?${pageRouterQueryParamKey}=${PageName.LandingPage}`} {...props} />
      ),
    },
    codeListsWithTextResources: {
      tabName: t('app_content_library.code_lists_with_text_resources.page_name'),
      tabId: PageName.CodeListsWithTextResources,
      icon: <CodeListsIcon />,
      renderTab: (props) => (
        <Link
          to={`?${pageRouterQueryParamKey}=${PageName.CodeListsWithTextResources}`}
          {...props}
        />
      ),
    },
    images: {
      tabName: t('app_content_library.images.page_name'),
      tabId: PageName.Images,
      icon: <ImageIcon />,
      renderTab: (props) => (
        <Link to={`?${pageRouterQueryParamKey}=${PageName.Images}`} {...props} />
      ),
    },
  };
};
