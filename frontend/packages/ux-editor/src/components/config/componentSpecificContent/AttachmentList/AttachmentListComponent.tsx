import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useTranslation } from 'react-i18next';
import { reservedDataTypes, selectionIsValid } from './attachmentListUtils';
import { AttachmentListInternalFormat } from './AttachmentListInternalFormat';
import { StudioSpinner } from '@studio/components';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';
import { convertInternalToExternalFormat } from './convertToExternalFormat';
import { convertExternalToInternalFormat } from './convertToInternalFormat';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { dataTypeIds = [] } = component || {};

  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();

  if (appMetadataPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.component_properties.loading')} />;

  const availableAttachments: AvailableAttachementLists = getAvailableAttachments(
    layoutSets,
    selectedLayoutSet,
    appMetadata.dataTypes,
  );

  const onChange = (selectedDataTypes: InternalDataTypesFormat) => {
    if (!selectionIsValid(selectedDataTypes)) return;

    const resultingSelection = convertInternalToExternalFormat(
      availableAttachments,
      selectedDataTypes,
    );

    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };

  return (
    <AttachmentListInternalFormat
      onChange={onChange}
      availableAttachments={availableAttachments}
      internalDataFormat={convertExternalToInternalFormat(availableAttachments, dataTypeIds)}
    />
  );
};

const getAvailableAttachments = (
  layoutSets: LayoutSets,
  selectedLayoutSet: string,
  availableDataTypes: DataTypeElement[],
): AvailableAttachementLists => {
  const attachmentsCurrentTasks = getAttachments(
    currentTasks(layoutSets, selectedLayoutSet),
    availableDataTypes,
  );
  const attachmentsAllTasks = getAttachments(
    sampleTasks(layoutSets, selectedLayoutSet),
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
