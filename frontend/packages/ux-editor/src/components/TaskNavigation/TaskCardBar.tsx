import React from 'react';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TaskCard } from './TaskCard';
import classes from './TaskCardBar.module.css';
import { AddNewTask } from '@altinn/ux-editor/components/TaskNavigation/AddNewTask';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { AddSubformCard } from '@altinn/ux-editor/components/TaskNavigation/AddSubformCard';

export const TaskCardBar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsModel, isPending: layoutSetsPending } = useLayoutSetsExtendedQuery(
    org,
    app,
  );

  const isTaskNavigationSubformEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigationSubform);

  if (layoutSetsPending) return null;

  return (
    <div className={classes.container}>
      <div className={classes.wrapper}>
        {layoutSetsModel.sets.map((layoutSetModel) => (
          <TaskCard key={layoutSetModel.id} layoutSetModel={layoutSetModel} />
        ))}
        <div className={classes.addCardsContainer}>
          <AddNewTask />
          {isTaskNavigationSubformEnabled && <AddSubformCard />}
        </div>
      </div>
    </div>
  );
};
