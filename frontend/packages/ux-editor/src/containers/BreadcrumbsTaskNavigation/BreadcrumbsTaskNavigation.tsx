import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import classes from './BreadcrumbsTaskNavigation.module.css';
import {
  StudioBreadcrumbs,
  StudioBreadcrumbsItem,
  StudioBreadcrumbsLink,
  StudioBreadcrumbsList,
} from '@studio/components';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { UrlUtils } from '@studio/pure-functions';

export const BreadcrumbsTaskNavigation = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: appConfigData } = useAppConfigQuery(org, app);
  const navigate = useNavigate();
  const { selectedFormLayoutSetName, removeSelectedFormLayoutSetName } = useAppContext();

  const location = useLocation();
  const currentRoutePath: string = UrlUtils.extractLastRouterParam(location.pathname);
  const isActive = currentRoutePath === 'ui-editor';

  const handleClick = () => {
    removeSelectedFormLayoutSetName();
    navigate('../' + RoutePaths.UIEditor);
  };

  return (
    <div className={classes.container}>
      <StudioBreadcrumbs>
        <StudioBreadcrumbsList>
          <StudioBreadcrumbsItem>
            <StudioBreadcrumbsLink onClick={handleClick}>
              {appConfigData?.serviceName}
            </StudioBreadcrumbsLink>
          </StudioBreadcrumbsItem>
          <StudioBreadcrumbsItem>
            <div className={isActive ? classes.active : undefined}>{selectedFormLayoutSetName}</div>
          </StudioBreadcrumbsItem>
        </StudioBreadcrumbsList>
      </StudioBreadcrumbs>
    </div>
  );
};
