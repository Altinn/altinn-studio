import type { IGenericEditComponent } from '../../componentConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useTranslation } from 'react-i18next';
import { reservedDataTypes } from './attachmentListUtils';
import { AttachmentListInternalFormat } from './AttachmentListInternalFormat';
import { StudioSpinner } from '@studio/components';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { getTaskId } from 'app-shared/utils/layoutSetsUtils';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';
import { convertInternalToExternalFormat } from './convertFunctions/convertToExternalFormat';
import { convertExternalToInternalFormat } from './convertFunctions/convertToInternalFormat';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import useUxEditorParams from '@altinn/ux-editor-v4/hooks/useUxEditorParams';

import type { JSX } from 'react';

type AttachmentListComponentProps = IGenericEditComponent<ComponentType.AttachmentList> & {
  className?: string;
};

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
  className,
}: AttachmentListComponentProps): JSX.Element => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { layoutSet } = useUxEditorParams();

  if (appMetadataPending)
    return <StudioSpinner aria-label={t('ux_editor.component_properties.loading')} />;

  const availableAttachments: AvailableAttachementLists = getAvailableAttachments(
    layoutSets,
    layoutSet,
    appMetadata.dataTypes,
  );

  const handleChange = (internalDataFormat: InternalDataTypesFormat) => {
    const externalDataFormat = convertInternalToExternalFormat(
      availableAttachments,
      internalDataFormat,
    );

    handleComponentChange({
      ...component,
      dataTypeIds: externalDataFormat,
    });
  };

  const currentSet = layoutSets?.find((set) => set.id === layoutSet);
  const isTaskCustomReceipt =
    currentSet != null && getTaskId(currentSet) === PROTECTED_TASK_NAME_CUSTOM_RECEIPT;

  const { dataTypeIds = [] } = component || {};
  const internalDataFormat = convertExternalToInternalFormat(availableAttachments, dataTypeIds);

  return (
    <AttachmentListInternalFormat
      onChange={handleChange}
      availableAttachments={availableAttachments}
      internalDataFormat={internalDataFormat}
      isTaskCustomReceipt={isTaskCustomReceipt}
      className={className}
    />
  );
};

const getAvailableAttachments = (
  layoutSets: LayoutSetResponse[],
  selectedFormLayoutSetName: string,
  availableDataTypes: DataTypeElement[],
): AvailableAttachementLists => {
  const attachmentsCurrentTasks = getAttachments(
    currentTasks(layoutSets, selectedFormLayoutSetName),
    availableDataTypes,
  );
  const attachmentsAllTasks = getAttachments(
    sampleTasks(layoutSets, selectedFormLayoutSetName),
    availableDataTypes,
  );

  return {
    attachmentsCurrentTasks,
    attachmentsAllTasks,
  };
};

const getAttachments = (
  tasks: string[],
  availableDataTypes: Partial<ApplicationMetadata['dataTypes']>,
): string[] => {
  const filteredAttachments = filterAttachments(availableDataTypes, tasks);
  const mappedAttachments = filteredAttachments?.map((dataType) => dataType.id);
  const sortedAttachments = mappedAttachments.sort((a, b) => a.localeCompare(b));
  return sortedAttachments;
};

const filterAttachments = (
  availableDataTypes: Partial<ApplicationMetadata['dataTypes']>,
  tasks: string[],
) => {
  return availableDataTypes.filter((dataType) => {
    const noReservedType = !Object.values(reservedDataTypes).includes(dataType.id);
    const noAppLogic = !dataType.appLogic;
    const hasMatchingTask = tasks?.some((task) => dataType.taskId === task);

    return noReservedType && noAppLogic && hasMatchingTask;
  });
};

const currentTasks = (
  layoutSets: LayoutSetResponse[],
  selectedFormLayoutSetName: string,
): string[] => {
  const set = layoutSets.find((layoutSet) => layoutSet.id === selectedFormLayoutSetName);
  const taskId = set ? getTaskId(set) : undefined;
  return taskId ? [taskId] : [];
};

const sampleTasks = (
  layoutSets: LayoutSetResponse[],
  selectedFormLayoutSetName: string,
): string[] => {
  const tasks = [];
  for (const layoutSet of layoutSets) {
    const taskId = getTaskId(layoutSet);
    if (taskId) tasks.push(taskId);
    if (layoutSet.id === selectedFormLayoutSetName) break;
  }
  return tasks;
};
