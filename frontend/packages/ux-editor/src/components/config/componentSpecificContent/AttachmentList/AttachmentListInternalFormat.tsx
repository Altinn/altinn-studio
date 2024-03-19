import React, { useState } from 'react';
import { Fieldset, Switch } from '@digdir/design-system-react';
import { AttachmentListContent } from './AttachmentListContent';
import { useTranslation } from 'react-i18next';
import { extractCurrentAvailableAttachments, isSelectionValid } from './attachmentListUtils';
import { ArrayUtils } from '@studio/pure-functions';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';

type AttachmentListInternalFormatProps = {
  onChange: (selectedDataTypes: InternalDataTypesFormat) => void;
  availableAttachments: AvailableAttachementLists;
  internalDataFormat: InternalDataTypesFormat;
};

export const AttachmentListInternalFormat = ({
  onChange,
  availableAttachments,
  internalDataFormat,
}: AttachmentListInternalFormatProps) => {
  const [dataTypesState, setDataTypesState] = useState<InternalDataTypesFormat>(internalDataFormat);
  const [isValid, setIsValid] = useState<boolean>(true);
  const { t } = useTranslation();

  const handleChange = (dataTypes: InternalDataTypesFormat) => {
    setDataTypesState((prev) => ({ ...prev, ...dataTypes }));
    if (isSelectionValid(dataTypes)) {
      setIsValid(true);
      onChange(dataTypes);
    } else {
      setIsValid(false);
    }
  };

  const handleIncludePdfChange = (isChecked: boolean) => {
    const updatedDataTypes: InternalDataTypesFormat = {
      ...dataTypesState,
      includePdf: isChecked,
    };
    handleChange(updatedDataTypes);
  };

  const handleCurrentTaskChange = (isCurrentTask: boolean) => {
    const dataTypesToBeSaved = isCurrentTask
      ? getAllowedDataTypesOnCurrentTask(
          dataTypesState.selectedDataTypes,
          availableAttachments.attachmentsCurrentTasks,
        )
      : dataTypesState.selectedDataTypes;

    handleChange({
      ...dataTypesState,
      selectedDataTypes: dataTypesToBeSaved,
      currentTask: isCurrentTask,
    });
  };

  const handleSelectedDataTypesChange = (selectedDataTypes: string[]) => {
    const updatedDataTypes: InternalDataTypesFormat = { ...dataTypesState, selectedDataTypes };
    handleChange(updatedDataTypes);
  };

  const currentAvailableAttachments = extractCurrentAvailableAttachments(
    dataTypesState.currentTask,
    availableAttachments,
  );
  const { includePdf, currentTask, selectedDataTypes } = dataTypesState;
  return (
    <Fieldset
      legend={t('ux_editor.component_title.AttachmentList_legend')}
      error={!isValid && t('ux_editor.component_title.AttachmentList_error')}
    >
      <Switch
        onChange={(e) => handleCurrentTaskChange(e.target.checked)}
        size='small'
        checked={currentTask}
      >
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Switch
        onChange={(e) => handleIncludePdfChange(e.target.checked)}
        size='small'
        checked={includePdf}
      >
        {t('ux_editor.component_properties.select_pdf')}
      </Switch>
      <AttachmentListContent
        currentAvailableAttachments={currentAvailableAttachments}
        selectedDataTypes={selectedDataTypes}
        onChange={handleSelectedDataTypesChange}
      />
    </Fieldset>
  );
};

const getAllowedDataTypesOnCurrentTask = (
  selectedDataTypes: string[],
  attachmentsCurrentTasks: string[],
): string[] => {
  return ArrayUtils.intersection(selectedDataTypes, attachmentsCurrentTasks);
};
