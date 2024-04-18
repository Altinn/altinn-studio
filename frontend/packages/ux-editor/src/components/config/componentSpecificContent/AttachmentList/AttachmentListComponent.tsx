import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useTranslation } from 'react-i18next';
import { reservedDataTypes } from './attachmentListUtils';
import { AttachmentListInternalFormat } from './AttachmentListInternalFormat';
import { StudioSpinner } from '@studio/components';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';
import { convertInternalToExternalFormat } from './convertFunctions/convertToExternalFormat';
import { convertExternalToInternalFormat } from './convertFunctions/convertToInternalFormat';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { selectedFormLayoutSetName } = useAppContext();

  if (appMetadataPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.component_properties.loading')} />;

  const availableAttachments: AvailableAttachementLists = getAvailableAttachments(
    layoutSets,
    selectedFormLayoutSetName,
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

  const { dataTypeIds = [] } = component || {};
  const internalDataFormat = convertExternalToInternalFormat(availableAttachments, dataTypeIds);

  return (
    <AttachmentListInternalFormat
      onChange={handleChange}
      availableAttachments={availableAttachments}
      internalDataFormat={internalDataFormat}
    />
  );
};

const getAvailableAttachments = (
  layoutSets: LayoutSets,
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
    const hasMatchingTask = tasks.some((task) => dataType.taskId === task);

    return noReservedType && noAppLogic && hasMatchingTask;
  });
};

const currentTasks = (layoutSets: LayoutSets, selectedFormLayoutSetName: string): string[] =>
  layoutSets.sets.find((layoutSet) => layoutSet.id === selectedFormLayoutSetName).tasks;

const sampleTasks = (layoutSets: LayoutSets, selectedFormLayoutSetName: string): string[] => {
  const tasks = [];
  for (const layoutSet of layoutSets.sets) {
    tasks.push(...layoutSet.tasks);
    if (layoutSet.id === selectedFormLayoutSetName) {
      break;
    }
  }
  return tasks;
};
