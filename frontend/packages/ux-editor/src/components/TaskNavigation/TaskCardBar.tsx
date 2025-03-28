import React from 'react';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TaskCard } from './TaskCard';
import classes from './TaskCardBar.module.css';
import { AddNewTask } from '@altinn/ux-editor/containers/AddNewTask';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

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
      {layoutSetsModel.sets.map((layoutSetModel) => (
        <TaskCard key={layoutSetModel.id} layoutSetModel={layoutSetModel} />
      ))}
      <AddNewTask />
      {/** featureFlags will be added to AddSubformCard componenet which will be created in this issue: #15036 */}
      {isTaskNavigationSubformEnabled}
    </div>
  );
};
