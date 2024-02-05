import React, { useState } from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { AttachmentListContent } from './AttachmentListContent';
import { StudioSpinner } from '@studio/components';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const [onlyCurrentTask, setOnlyCurrentTask] = useState(false);
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets, isPending } = useLayoutSetsQuery(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();

  const getTasks = () => {
    if (!layoutSets) return [];
    const currentTask = () =>
      layoutSets?.sets.find((layoutSet) => layoutSet.id === selectedLayoutSet).tasks ?? [];

    const sampleTasks = () => {
      const tasks = [];
      for (const layoutSet of layoutSets.sets) {
        tasks.push(...layoutSet.tasks);
        if (layoutSet.id === selectedLayoutSet) {
          break;
        }
      }
      return tasks;
    };

    return onlyCurrentTask ? currentTask() : sampleTasks();
  };

  const getDataTypes = () => {
    const tasks = getTasks();
    const filteredDataTypes = appMetadata?.dataTypes.filter(
      (dataType: DataTypeElement) =>
        !dataType.appLogic &&
        (tasks.some((task) => dataType.taskId === task) || dataType.id === 'ref-data-as-pdf'),
    );

    const mappedDataTypes =
      filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
    const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

    sortedDataTypes.length !== 0 && mappedDataTypes.unshift('include-all', 'include-attachments');
    return mappedDataTypes;
  };

  return isPending ? (
    <StudioSpinner />
  ) : (
    <AttachmentListContent
      component={component}
      handleComponentChange={handleComponentChange}
      dataTypes={getDataTypes()}
      onlyCurrentTask={onlyCurrentTask}
      setOnlyCurrentTask={setOnlyCurrentTask}
    />
  );
};

/* TODO 31.01.23 */
// Add unit tests
// Let be used in beta + v4
