import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { AttachmentListContent } from './AttachmentListContent';
import { Switch } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { ArrayUtils } from '@studio/pure-functions';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();

  const reservedDataTypes = {
    currentTask: 'current-task',
    refDataAsPdf: 'ref-data-as-pdf',
    includeAll: 'include-all',
  };

  const selectedAttachments = component?.dataTypeIds ?? [];
  const onlyCurrentTask = selectedAttachments.includes(reservedDataTypes.currentTask);
  const includePdf = selectedAttachments.includes(reservedDataTypes.refDataAsPdf);

  const tasks: string[] = layoutSets
    ? getTasks(layoutSets, selectedLayoutSet, onlyCurrentTask)
    : [];
  const attachmentsToDisplay: string[] = getAttachments(tasks, appMetadata, reservedDataTypes);

  const selectedAttachmentsToDisplay = selectedAttachments.filter((attachment: string) => {
    const isNotTaskId = attachment !== reservedDataTypes.currentTask;
    const isNotPdfId = attachment !== reservedDataTypes.refDataAsPdf;
    const isIncluded = attachmentsToDisplay.includes(attachment);

    return onlyCurrentTask ? isNotTaskId && isNotPdfId && isIncluded : isNotTaskId && isNotPdfId;
  });

  const onChangePdf = (isChecked: boolean) => {
    const updatedSelectedAttachments: string[] = toggleItemInArray(
      selectedAttachments,
      reservedDataTypes.refDataAsPdf,
      isChecked,
    );

    handleComponentChange({
      ...component,
      dataTypeIds: updatedSelectedAttachments,
    });
  };

  const onChangeTask = (isChecked: boolean) => {
    const updatedSelectedAttachments: string[] = toggleItemInArray(
      selectedAttachments,
      reservedDataTypes.currentTask,
      isChecked,
    );

    handleComponentChange({
      ...component,
      dataTypeIds: updatedSelectedAttachments,
    });
  };

  return (
    <>
      <Switch
        onChange={(e) => onChangeTask(e.target.checked)}
        size='small'
        checked={onlyCurrentTask}
      >
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Switch onChange={(e) => onChangePdf(e.target.checked)} size='small' checked={includePdf}>
        {t('ux_editor.component_properties.select_pdf')}
      </Switch>
      <AttachmentListContent
        component={component}
        handleComponentChange={handleComponentChange}
        selectedAttachments={selectedAttachmentsToDisplay}
        attachments={attachmentsToDisplay}
        onlyCurrentTask={onlyCurrentTask}
        includePdf={includePdf}
        reservedDataTypes={reservedDataTypes}
      />
    </>
  );
};

const getTasks = (
  layoutSets: LayoutSets,
  selectedLayoutSet: string,
  onlyCurrentTask: boolean,
): string[] => {
  return onlyCurrentTask
    ? currentTasks(layoutSets, selectedLayoutSet)
    : sampleTasks(layoutSets, selectedLayoutSet);
};

const currentTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] =>
  layoutSets.sets.find((layoutSet) => layoutSet.id === selectedLayoutSet).tasks;

const sampleTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] => {
  const tasks = [];
  for (const layoutSet of layoutSets.sets) {
    tasks.push(...layoutSet.tasks);
    if (layoutSet.id === selectedLayoutSet) {
      break;
    }
  }
  return tasks;
};

const getAttachments = (
  tasks: string[],
  appMetaData: ApplicationMetadata,
  reservedDataTypes: { currentTask: string; refDataAsPdf: string; includeAll: string },
): string[] => {
  const filteredDataTypes = appMetaData?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic &&
      tasks.some((task) => dataType.taskId === task) &&
      dataType.id !== reservedDataTypes.refDataAsPdf &&
      dataType.id !== reservedDataTypes.currentTask,
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
  const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

  sortedDataTypes.length !== 0 && mappedDataTypes.unshift(reservedDataTypes.includeAll);
  return mappedDataTypes;
};

const toggleItemInArray = (array: string[], item: string, add: boolean): string[] =>
  add ? array.concat(item) : ArrayUtils.removeItemByValue(array, item);
