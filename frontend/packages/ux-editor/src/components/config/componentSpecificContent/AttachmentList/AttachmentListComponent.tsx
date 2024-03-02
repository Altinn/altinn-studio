import React, { useState } from 'react';
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
import {
  reservedDataTypes,
  translateToAllAttachments,
  translateToSomeAttachments,
} from './AttachmentListUtils';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const [noneSelected, setNoneSelected] = useState<boolean>(false);
  const [includePdf, setIncludePdf] = useState<boolean>(
    (component?.dataTypeIds || []).includes(
      reservedDataTypes.refDataAsPdf || reservedDataTypes.includeAll,
    ),
  );
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();
  console.log(component);
  const onlyCurrentTask = (component?.dataTypeIds || []).includes(reservedDataTypes.currentTask);
  // const includePdf = (component?.dataTypeIds || []).includes(reservedDataTypes.refDataAsPdf);

  const tasks: string[] = layoutSets
    ? getTasks(layoutSets, selectedLayoutSet, onlyCurrentTask)
    : [];
  const attachmentsToDisplay: string[] = getAttachments(tasks, appMetadata);
  const selectedAttachments = getSelectedAttachments(component?.dataTypeIds, attachmentsToDisplay);

  const selectedAttachmentsToDisplay = selectedAttachments.filter((attachment: string) => {
    const isNotTaskId = attachment !== reservedDataTypes.currentTask;
    const isNotPdfId = attachment !== reservedDataTypes.refDataAsPdf;
    const isIncluded = attachmentsToDisplay.includes(attachment);

    return onlyCurrentTask ? isNotTaskId && isNotPdfId && isIncluded : isNotTaskId && isNotPdfId;
  });

  const onChangePdf = (isChecked: boolean) => {
    setIncludePdf(isChecked);
    if (!isChecked && selectedAttachmentsToDisplay.length === 0) {
      setNoneSelected(true);
      return;
    }
    setNoneSelected(false);

    console.log(isChecked);
    // const isAllAttachmentsSelected: boolean =
    //   selectedAttachmentsToDisplay.length === attachmentsToDisplay.length;
    const isAllAttachmentsSelected: boolean =
      selectedAttachmentsToDisplay.length === attachmentsToDisplay.length;
    // Legg til noneselected et sted her
    console.log(noneSelected);
    const resultingSelection =
      isAllAttachmentsSelected && !noneSelected
        ? translateToAllAttachments(isChecked, onlyCurrentTask)
        : translateToSomeAttachments(
            isChecked,
            onlyCurrentTask,
            !noneSelected ? selectedAttachmentsToDisplay : [],
          );
    console.log(resultingSelection);
    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };
  console.log('ispdf', includePdf);
  const onChangeTask = (isChecked: boolean) => {
    const updatedSelectedAttachments: string[] = toggleItemInArray(
      selectedAttachments,
      reservedDataTypes.currentTask,
      isChecked,
    );
    // if (!noneSelected && !isChecked)
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
        noneSelected={noneSelected}
        setNoneSelected={setNoneSelected}
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

const getAttachments = (tasks: string[], appMetaData: ApplicationMetadata): string[] => {
  const filteredDataTypes = appMetaData?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic &&
      tasks.some((task) => dataType.taskId === task) &&
      dataType.id !== reservedDataTypes.refDataAsPdf &&
      dataType.id !== reservedDataTypes.currentTask,
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
  const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

  return sortedDataTypes;
};

const getSelectedAttachments = (
  incomingSelectedAttachments: string[] | undefined,
  incomingAttachments: string[],
): string[] => {
  // All attachments is configured as either 'include-all', empty array, undefined or only containing 'current-task'
  const isAllAttachmentsSelected: boolean =
    incomingSelectedAttachments?.includes('include-all') ||
    (Array.isArray(incomingSelectedAttachments) && incomingSelectedAttachments.length === 0) ||
    incomingSelectedAttachments === undefined ||
    (incomingSelectedAttachments.includes('current-task') &&
      incomingSelectedAttachments.length === 1);

  return isAllAttachmentsSelected ? incomingAttachments : incomingSelectedAttachments;
};

const toggleItemInArray = (array: string[], item: string, add: boolean): string[] =>
  add ? array.concat(item) : ArrayUtils.removeItemByValue(array, item);
