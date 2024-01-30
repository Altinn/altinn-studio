import React from 'react';
import { Combobox, Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery'; //Why is this path different from useAppMetadataQuery?
import { useAppContext } from '../../../../hooks/useAppContext';
import { useTranslation } from 'react-i18next';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const [onlyCurrentTask, setOnlyCurrentTask] = React.useState(false);
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const {
    // status: appMetadataStatus, // TODO: find out if this is needed (pending status)
    data: appMetadata,
    // error: appMetadataError, // TODO: find out if this is needed
  } = useAppMetadataQuery(org, app);

  const tasks: string[] = getTasks(layoutSets, selectedLayoutSet, onlyCurrentTask);
  const dataTypes: string[] = getDataTypes(appMetadata, tasks);

  return (
    <>
      <Switch onChange={() => setOnlyCurrentTask(!onlyCurrentTask)}>
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Combobox multiple>
        {dataTypes.map((dataType) => {
          return (
            <Combobox.Option
              key={dataType}
              value={dataType}
              description={dataType === 'ref-data-as-pdf' ? 'PDF' : dataType}
              displayValue={dataType}
            />
          );
        })}
      </Combobox>
    </>
  );
};

const getTasks = (layoutSets: LayoutSets, selectedLayoutSet: string, onlyCurrentTask: boolean) => {
  const currentTask = () =>
    layoutSets.sets.find((layoutSet) => layoutSet.id === selectedLayoutSet).tasks ?? [];

  const filterTasks = () => {
    const tasks = [];
    for (const layoutSet of layoutSets.sets) {
      tasks.push(...layoutSet.tasks);
      if (layoutSet.id === selectedLayoutSet) {
        break;
      }
    }
    return tasks;
  };

  return onlyCurrentTask ? currentTask() : filterTasks();
};

const getDataTypes = (appMetadata: ApplicationMetadata, tasks: string[]) => {
  const filteredDataTypes = appMetadata?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic && tasks.some((task) => dataType.taskId === task),
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];

  return mappedDataTypes;
};
