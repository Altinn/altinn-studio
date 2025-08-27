import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import classes from './BreadcrumbsTaskNavigation.module.css';
import { StudioBreadcrumbs } from '@studio/components';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { UrlUtils } from 'libs/studio-pure-functions/src';
import { useTranslation } from 'react-i18next';
export const BreadcrumbsTaskNavigation = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedFormLayoutSetName, removeSelectedFormLayoutSetName } = useAppContext();
  const location = useLocation();
  const currentRoutePath = UrlUtils.extractLastRouterParam(location.pathname);
  const isOnUIEditor = currentRoutePath === 'ui-editor';

  const handleClick = () => {
    removeSelectedFormLayoutSetName();
    navigate(`../${RoutePaths.UIEditor}`);
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
            <div className={isOnUIEditor ? classes.layoutSet : undefined}>
              {selectedFormLayoutSetName}
            </div>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
    </div>
  );
};
