import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useTranslation } from 'react-i18next';
import {
  reservedDataTypes,
  convertInternalToExternalFormat,
  getTasks,
  convertExternalToInternalFormat,
  selectionIsValid,
} from './AttachmentListUtils';
import { AttachmentListInternalFormat } from './AttachmentListInternalFormat';
import { StudioSpinner } from '@studio/components';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { dataTypeIds = [] } = component || {};
  const currentTask = dataTypeIds.includes(reservedDataTypes.currentTask);

  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();

  if (appMetadataPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.component_properties.loading')} />;

  const tasks: string[] =
    layoutSets && selectedLayoutSet ? getTasks(layoutSets, selectedLayoutSet, currentTask) : [];

  const internalDataFormat = convertExternalToInternalFormat(
    tasks,
    appMetadata.dataTypes,
    dataTypeIds,
  );

  const handleOutGoingData = (selectedDataTypes: string[], availableAttachments: string[]) => {
    if (!selectionIsValid(selectedDataTypes)) return;

    const resultingSelection = convertInternalToExternalFormat(
      selectedDataTypes,
      availableAttachments,
    );

    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };

  return (
    <AttachmentListInternalFormat
      handleOutGoingData={handleOutGoingData}
      internalDataFormat={internalDataFormat}
      layoutSets={layoutSets}
      selectedLayoutSet={selectedLayoutSet}
      appMetadata={appMetadata}
    />
  );
};
