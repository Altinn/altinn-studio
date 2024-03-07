import React from 'react';
import { Combobox, Label, Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './AttachmentListContent.module.css';
import { validateSelection } from './AttachmentListUtils';

type IAttachmentListContent = {
  availableAttachments: string[];
  currentSelectedDataTypes: string[];
  setCurrentSelectedDataTypes: (selectedDataTypes: string[]) => void;
  handleOutGoingData: (selectedDataTypes: string[], availableAttachments: string[]) => void;
};

export const AttachmentListContent = ({
  availableAttachments,
  currentSelectedDataTypes,
  setCurrentSelectedDataTypes,
  handleOutGoingData,
}: IAttachmentListContent) => {
  const { t } = useTranslation();
  const selectedAttachments = currentSelectedDataTypes.filter(
    (dataType) => !availableAttachments.includes(dataType),
  );

  const handleCheckboxChange = (isChecked: boolean) => {
    const updatedSelectedDataTypes = [
      ...new Set([...currentSelectedDataTypes, ...(isChecked ? availableAttachments : [])]),
    ];
    setCurrentSelectedDataTypes(updatedSelectedDataTypes);

    handleOutGoingData(updatedSelectedDataTypes, availableAttachments);
  };

  const handleComboboxChange = (updatedSelection: string[]) => {
    const updatedSelectedDataTypes = [
      ...new Set([...updatedSelection, ...currentSelectedDataTypes]),
    ];
    setCurrentSelectedDataTypes(updatedSelectedDataTypes);

    handleOutGoingData(updatedSelectedDataTypes, availableAttachments);
  };

  return (
    <>
      <Label htmlFor={'attachmentList'}>
        {t('ux_editor.component_properties.select_attachments')}
      </Label>
      <Checkbox
        size='small'
        // checked={!noneSelected && selectedAttachments.length === attachments.length}
        checked={selectedAttachments.length === availableAttachments.length}
        indeterminate={
          selectedAttachments.length > 0 && selectedAttachments.length < availableAttachments.length
        }
        value='Alle Vedlegg'
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
          !validateSelection(currentSelectedDataTypes) &&
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
