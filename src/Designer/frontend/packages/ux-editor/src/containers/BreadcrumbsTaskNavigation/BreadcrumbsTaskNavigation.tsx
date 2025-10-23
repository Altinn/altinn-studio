import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classes from './BreadcrumbsTaskNavigation.module.css';
import { StudioBreadcrumbs } from '@studio/components';
import { UrlUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export const BreadcrumbsTaskNavigation = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { layoutSet } = useUxEditorParams();
  const location = useLocation();
  const currentRoutePath = UrlUtils.extractLastRouterParam(location.pathname);
  const isOnUIEditor = currentRoutePath === 'ui-editor';

  const handleClick = () => {
    navigate(`../`);
  };

  return (
    <div className={classes.container}>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link
              className={`${classes.homePage} ${isOnUIEditor && classes.homePageActive}`}
              onClick={handleClick}
            >
              {t('ux_editor.breadcrumbs.front_page')}
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <div className={isOnUIEditor ? classes.layoutSet : undefined}>{layoutSet}</div>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
    </div>
  );
};
