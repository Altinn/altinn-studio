import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { ToggleAddComponentPoc } from './DesignView/AddItem/ToggleAddComponentPoc';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';

export const FormDesignerToolbar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsExtended } = useLayoutSetsExtendedQuery(org, app);
  const layoutSetNames = layoutSetsExtended?.sets;
  const isTaskNavigationEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigation);

  return (
    <section className={classes.toolbar}>
      {isTaskNavigationEnabled ? (
        <BreadcrumbsTaskNavigation />
      ) : (
        layoutSetNames && <LayoutSetsContainer />
      )}
      {/* POC of new design for adding components*/}
      <ToggleAddComponentPoc />
    </section>
  );
};
