import { useState, useEffect } from 'react';
import { AttachmentListContent } from './AttachmentListContent';
import { useTranslation } from 'react-i18next';
import { extractCurrentAvailableAttachments, isSelectionValid } from './attachmentListUtils';
import { ArrayUtils } from '@studio/pure-functions';
import type { AvailableAttachmentLists, InternalDataTypesFormat } from './types';
import { StudioFieldset, StudioSwitch, StudioValidationMessage } from '@studio/components';

type AttachmentListInternalFormatProps = {
  onChange: (selectedDataTypes: InternalDataTypesFormat) => void;
  availableAttachments: AvailableAttachmentLists;
  internalDataFormat: InternalDataTypesFormat;
  isTaskCustomReceipt: boolean;
  className?: string;
};

export const AttachmentListInternalFormat = ({
  onChange,
  availableAttachments,
  internalDataFormat,
  isTaskCustomReceipt,
  className,
}: AttachmentListInternalFormatProps) => {
  const [dataTypesState, setDataTypesState] = useState<InternalDataTypesFormat>(internalDataFormat);
  const [isValid, setIsValid] = useState<boolean>(true);
  const { t } = useTranslation();

  useEffect(() => {
    setDataTypesState(internalDataFormat);
    setIsValid(true);
  }, [internalDataFormat]);

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

  const errorMessage = isTaskCustomReceipt
    ? t('ux_editor.component_title.AttachmentListOrPdf_error')
    : t('ux_editor.component_title.AttachmentList_error');

  return (
    <StudioFieldset
      legend={t('ux_editor.component_title.AttachmentList_legend')}
      className={className}
    >
      <StudioSwitch
        data-size='sm'
        onChange={(e) => handleCurrentTaskChange(e.target.checked)}
        checked={currentTask}
        label={t('ux_editor.component_properties.current_task')}
      />
      {isTaskCustomReceipt && (
        <StudioSwitch
          data-size='sm'
          onChange={(e) => handleIncludePdfChange(e.target.checked)}
          checked={includePdf}
          label={t('ux_editor.component_properties.select_pdf')}
        />
      )}
      <AttachmentListContent
        currentAvailableAttachments={currentAvailableAttachments}
        selectedDataTypes={ArrayUtils.intersection(selectedDataTypes, currentAvailableAttachments)}
        onChange={handleSelectedDataTypesChange}
      />
      {!isValid && <StudioValidationMessage>{errorMessage}</StudioValidationMessage>}
    </StudioFieldset>
  );
};

const getAllowedDataTypesOnCurrentTask = (
  selectedDataTypes: string[],
  attachmentsCurrentTasks: string[],
): string[] => {
  return ArrayUtils.intersection(selectedDataTypes, attachmentsCurrentTasks);
};
