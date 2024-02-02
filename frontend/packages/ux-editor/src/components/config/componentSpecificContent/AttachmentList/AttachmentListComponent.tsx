import React from 'react';
import { Combobox, Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import { useTranslation } from 'react-i18next';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import classes from './AttachmentListComponent.module.css';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const [onlyCurrentTask, setOnlyCurrentTask] = React.useState(false);
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  const tasks: string[] = getTasks(layoutSets, selectedLayoutSet, onlyCurrentTask);
  const dataTypes: string[] = getDataTypes(appMetadata, tasks);

  const handleValueChanges = (updateDataTypes: string[]) => {
    const last = updateDataTypes[updateDataTypes.length - 1];
    switch (last) {
      case 'include-all':
        updateDataTypes = ['include-all'];
        break;
      case 'include-attachments':
        updateDataTypes = [];
        break;
      default:
        updateDataTypes = updateDataTypes.filter(
          (dataType) => dataType !== 'include-all' && dataType !== 'include-attachments',
        );
        break;
    }
    handleComponentChange({ ...component, dataTypeIds: updateDataTypes });
  };

  const getCurrentDataTypes = () => {
    let value: string[];
    if (onlyCurrentTask) {
      const currentDataTypes = component.dataTypeIds.filter((dataType: string) =>
        dataTypes.includes(dataType),
      );
      value = currentDataTypes;
    } else {
      value = component.dataTypeIds ?? [];
    }

    return value.length === 0 ? ['include-attachments'] : value;
  };

  return (
    <>
      <Switch onChange={() => setOnlyCurrentTask(!onlyCurrentTask)} size='small'>
        {t('ux_editor.component_properties.current_task')}
      </Switch>

      <Combobox
        multiple
        label={t('ux_editor.component_properties.select_attachments')}
        className={classes.comboboxLabel}
        size='small'
        value={getCurrentDataTypes()}
        onValueChange={handleValueChanges}
      >
        {dataTypes.map((dataType) => {
          return (
            <Combobox.Option
              key={dataType}
              value={dataType}
              description={getDescription(dataType)}
              displayValue={getDescription(dataType)}
            />
          );
        })}
      </Combobox>
    </>
  );
};

const getTasks = (layoutSets: LayoutSets, selectedLayoutSet: string, onlyCurrentTask: boolean) => {
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

const getDataTypes = (appMetadata: ApplicationMetadata, tasks: string[]) => {
  const filteredDataTypes = appMetadata?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic &&
      (tasks.some((task) => dataType.taskId === task) || dataType.id === 'ref-data-as-pdf'),
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
  const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

  sortedDataTypes.length !== 0 && mappedDataTypes.unshift('include-all', 'include-attachments');
  return mappedDataTypes;
};

const getDescription = (dataType: string) => {
  switch (dataType) {
    case 'ref-data-as-pdf':
      return 'Generert PDF';
    case 'include-all':
      return 'Alle vedlegg (inkl. PDF)';
    case 'include-attachments':
      return 'Alle vedlegg (eksl. PDF)';
    default:
      return dataType;
  }
};

/* TODO 31.01.23 */
// Go over the code and simplify it if possible (Can I make the multiple combobox more generic?)
// Add unit tests
// Let be used in beta + v4
