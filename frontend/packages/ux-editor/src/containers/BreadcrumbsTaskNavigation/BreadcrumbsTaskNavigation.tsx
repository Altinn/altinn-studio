import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

import React from 'react';
import { useNavigate } from 'react-router-dom';
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

export const BreadcrumbsTaskNavigation = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: appConfigData } = useAppConfigQuery(org, app);
  const navigate = useNavigate();
  const { selectedFormLayoutSetName, removeSelectedFormLayoutSetName } = useAppContext();

  const handleClick = () => {
    removeSelectedFormLayoutSetName();
    navigate('../' + RoutePaths.UIEditor);
  };
  return (
    <div>
      <div>
        <StudioBreadcrumbs className={classes.breadcrumbWrapper}>
          <StudioBreadcrumbsList>
            <StudioBreadcrumbsItem>
              <StudioBreadcrumbsLink onClick={handleClick}>
                {appConfigData?.serviceName}
              </StudioBreadcrumbsLink>
            </StudioBreadcrumbsItem>
            <StudioBreadcrumbsItem>{selectedFormLayoutSetName}</StudioBreadcrumbsItem>
          </StudioBreadcrumbsList>
        </StudioBreadcrumbs>
      </div>
    </div>
  );
};
