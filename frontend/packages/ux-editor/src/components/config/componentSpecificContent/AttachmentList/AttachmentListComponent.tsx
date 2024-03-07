import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ComponentType } from 'app-shared/types/ComponentType';
import {
  reservedDataTypes,
  dataExternalFormat,
  getTasks,
  dataInternalFormat,
  validateSelection,
} from './AttachmentListUtils';
import { AttachmentListInternalFormat } from './AttachmentListInternalFormat';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { dataTypeIds = [] } = component || {};
  const currentTask = dataTypeIds.includes(reservedDataTypes.currentTask);

  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();

  if (appMetadataPending) return null;

  const tasks: string[] =
    layoutSets && selectedLayoutSet ? getTasks(layoutSets, selectedLayoutSet, currentTask) : [];

  const internalDataFormat = dataInternalFormat(tasks, appMetadata.dataTypes, dataTypeIds);

  const handleOutGoingData = (selectedDataTypes: string[], availableAttachments: string[]) => {
    if (!validateSelection(selectedDataTypes)) return;

    const resultingSelection = dataExternalFormat(selectedDataTypes, availableAttachments);

    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };

  return (
    <AttachmentListInternalFormat
      handleOutGoingData={handleOutGoingData}
      internalFormat={internalDataFormat}
    />
  );
};
