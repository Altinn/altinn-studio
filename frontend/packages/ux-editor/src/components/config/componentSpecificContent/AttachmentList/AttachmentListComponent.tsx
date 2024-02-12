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

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();

  const selectedAttachments = component?.dataTypeIds;
  const [onlyCurrentTask, setOnlyCurrentTask] = useState(
    selectedAttachments && selectedAttachments.includes('current-task') ? true : false,
  );
  const [includePdf, setIncludePdf] = useState(
    selectedAttachments && selectedAttachments.includes('ref-data-as-pdf') ? true : false,
  );

  const tasks: string[] = getTasks(layoutSets, selectedLayoutSet, onlyCurrentTask);
  const attachmentsToUse: string[] = getAttachments(tasks, appMetadata);

  const selectedAttachmentsToUse = selectedAttachments.filter((attachment: string) => {
    const isNotTaskId = attachment !== 'current-task';
    const isNotPdfId = attachment !== 'ref-data-as-pdf';
    const isIncluded = attachmentsToUse.includes(attachment);

    return onlyCurrentTask ? isNotTaskId && isNotPdfId && isIncluded : isNotTaskId && isNotPdfId;
  });

  const onChangePdf = (isChecked: boolean) => {
    const updatedSelectedAttachments: string[] = isChecked
      ? selectedAttachments.concat('ref-data-as-pdf')
      : selectedAttachments.filter((attachment: string) => attachment !== 'ref-data-as-pdf');

    setIncludePdf(!includePdf);
    handleComponentChange({
      ...component,
      dataTypeIds: updatedSelectedAttachments,
    });
  };

  const onChangeTask = (isChecked: boolean) => {
    const updatedSelectedAttachments: string[] = isChecked
      ? selectedAttachments.concat('current-task')
      : selectedAttachments.filter((attachment: string) => attachment !== 'current-task');

    setOnlyCurrentTask(!onlyCurrentTask);
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
        Inkluder PDF
      </Switch>
      <AttachmentListContent
        component={component}
        handleComponentChange={handleComponentChange}
        selectedAttachments={selectedAttachmentsToUse}
        attachments={attachmentsToUse}
        onlyCurrentTask={onlyCurrentTask}
        includePdf={includePdf}
      />
    </>
  );
};

const getTasks = (
  layoutSets: LayoutSets,
  selectedLayoutSet: string,
  onlyCurrentTask: boolean,
): string[] => {
  if (!layoutSets.sets) return undefined;
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

const getAttachments = (tasks: string[], appMetaData: ApplicationMetadata): string[] => {
  const filteredDataTypes = appMetaData?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic &&
      tasks.some((task) => dataType.taskId === task) &&
      dataType.id !== 'ref-data-as-pdf' &&
      dataType.id !== 'current-task',
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
  const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

  sortedDataTypes.length !== 0 && mappedDataTypes.unshift('include-all');
  return mappedDataTypes;
};
