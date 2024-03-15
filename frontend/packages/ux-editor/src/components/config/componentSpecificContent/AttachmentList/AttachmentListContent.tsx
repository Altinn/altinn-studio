import React from 'react';
import { Combobox, Label, Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './AttachmentListContent.module.css';
import type { AttachmentsFormat, InternalDataTypesFormat } from './AttachmentListUtils';

type IAttachmentListContent = {
  availableAttachments: AttachmentsFormat;
  dataTypes: InternalDataTypesFormat;
  setDataTypes: (selectedDataTypes: InternalDataTypesFormat) => void;
  onChange: (selectedDataTypes: InternalDataTypesFormat) => void;
};

export const AttachmentListContent = ({
  availableAttachments,
  dataTypes,
  setDataTypes,
  onChange,
}: IAttachmentListContent) => {
  const { t } = useTranslation();
  const { attachmentsCurrentTasks, attachmentsAllTasks } = availableAttachments;
  const { selectedDataTypes, currentTask } = dataTypes;
  const currentAvailableAttachments = currentTask ? attachmentsCurrentTasks : attachmentsAllTasks;
  const checkboxInIndeterminateState =
    selectedDataTypes.length > 0 && selectedDataTypes.length < currentAvailableAttachments.length;

  const handleCheckboxChange = (isChecked: boolean) => {
    const updatedSelectedDataTypes = isChecked ? currentAvailableAttachments : [];
    setDataTypes({
      ...dataTypes,
      selectedDataTypes: updatedSelectedDataTypes,
    });
    onChange({
      ...dataTypes,
      selectedDataTypes: updatedSelectedDataTypes,
    });
  };

  const handleComboboxChange = (updatedSelectedDataTypes: string[]) => {
    setDataTypes({
      ...dataTypes,
      selectedDataTypes: updatedSelectedDataTypes,
    });
    onChange({
      ...dataTypes,
      selectedDataTypes: updatedSelectedDataTypes,
    });
  };

  return (
    <>
      <Label htmlFor={'attachmentList'}>
        {t('ux_editor.component_properties.select_attachments')}
      </Label>
      <Checkbox
        size='small'
        checked={selectedDataTypes.length === currentAvailableAttachments.length}
        indeterminate={checkboxInIndeterminateState}
        value={t('ux_editor.component_properties.select_all_attachments')}
        onChange={(e) => handleCheckboxChange(e.target.checked)}
      >
        {t('ux_editor.component_properties.select_all_attachments')}
      </Checkbox>
      <Combobox
        id={'attachmentList'}
        multiple
        className={classes.comboboxLabel}
        size='small'
        value={selectedDataTypes}
        onValueChange={handleComboboxChange}
      >
        {currentAvailableAttachments?.map((attachment) => {
          return (
            <Combobox.Option
              key={attachment}
              value={attachment}
              description={attachment}
              displayValue={attachment}
            />
          );
        })}
      </Combobox>
    </>
  );
};
