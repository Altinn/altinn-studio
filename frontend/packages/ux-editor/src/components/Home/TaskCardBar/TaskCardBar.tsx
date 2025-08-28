import React from 'react';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TaskCard } from './TaskCard';
import classes from './TaskCardBar.module.css';
import { AddNewTask } from './AddNewTask';
import { AddSubformCard } from './AddSubformCard';

export const TaskCardBar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets, isPending: layoutSetsPending } = useLayoutSetsExtendedQuery(org, app);
  const [isCreateSubformMode, setIsCreateSubformMode] = React.useState(false);

  if (layoutSetsPending) return null;

  return (
    <div className={classes.container}>
      <div className={classes.wrapper}>
        {layoutSets.map((layoutSetModel) => (
          <TaskCard key={layoutSetModel.id} layoutSetModel={layoutSetModel} />
        ))}
        <div className={classes.addCardsContainer}>
          {!isCreateSubformMode && <AddNewTask />}
          <AddSubformCard
            isSubformInEditMode={isCreateSubformMode}
            setIsCreateSubformMode={setIsCreateSubformMode}
          />
        </div>
      </div>
    </div>
  );
};
