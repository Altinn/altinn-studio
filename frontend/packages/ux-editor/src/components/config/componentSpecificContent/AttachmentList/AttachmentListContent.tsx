import React from 'react';
import { Combobox, Label, Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './AttachmentListContent.module.css';
import { selectionIsValid } from './AttachmentListUtils';
import { ArrayUtils } from '@studio/pure-functions';

type IAttachmentListContent = {
  availableAttachments: string[];
  selectedDataTypes: string[];
  setSelectedDataTypes: (selectedDataTypes: string[]) => void;
  handleOutGoingData: (selectedDataTypes: string[], availableAttachments: string[]) => void;
};

export const AttachmentListContent = ({
  availableAttachments,
  selectedDataTypes,
  setSelectedDataTypes,
  handleOutGoingData,
}: IAttachmentListContent) => {
  const { t } = useTranslation();

  const selectedAttachments = ArrayUtils.intersection(selectedDataTypes, availableAttachments);
  const selectedReservedDataTypes = ArrayUtils.intersection(
    selectedDataTypes,
    availableAttachments,
    false,
  );

  const handleCheckboxChange = (isChecked: boolean) => {
    const updatedSelectedDataTypes = [
      ...new Set([...selectedReservedDataTypes, ...(isChecked ? availableAttachments : [])]),
    ];
    setSelectedDataTypes(updatedSelectedDataTypes);

    handleOutGoingData(updatedSelectedDataTypes, availableAttachments);
  };

  const handleComboboxChange = (updatedSelection: string[]) => {
    const updatedSelectedDataTypes = [
      ...new Set([...updatedSelection, ...selectedReservedDataTypes]),
    ];
    setSelectedDataTypes(updatedSelectedDataTypes);

    handleOutGoingData(updatedSelectedDataTypes, availableAttachments);
  };

  return (
    <>
      <Label htmlFor={'attachmentList'}>
        {t('ux_editor.component_properties.select_attachments')}
      </Label>
      <Checkbox
        size='small'
        checked={selectedAttachments.length === availableAttachments.length}
        indeterminate={
          selectedAttachments.length > 0 && selectedAttachments.length < availableAttachments.length
        }
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
        value={selectedAttachments}
        onValueChange={handleComboboxChange}
        error={
          !selectionIsValid(selectedDataTypes) &&
          t('ux_editor.component_title.AttachmentList_error')
        }
      >
        {availableAttachments?.map((attachment) => {
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
