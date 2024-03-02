import React, { useState } from 'react';
import { Combobox, Label, Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { IGenericEditComponent } from '../../componentConfig';
import classes from './AttachmentListContent.module.css';
import { translateToAllAttachments, translateToSomeAttachments } from './AttachmentListUtils';

type IAttachmentListContent = IGenericEditComponent & {
  selectedAttachments: string[];
  attachments: string[];
  onlyCurrentTask: boolean;
  includePdf: boolean;
  noneSelected: boolean;
  setNoneSelected: (noneSelected: boolean) => void;
};

export const AttachmentListContent = ({
  component,
  handleComponentChange,
  selectedAttachments,
  attachments,
  onlyCurrentTask,
  includePdf,
  noneSelected,
  setNoneSelected,
}: IAttachmentListContent) => {
  const { t } = useTranslation();
  const handleCheckboxChange = (isChecked: boolean) => {
    if (!isChecked && !includePdf) {
      setNoneSelected(true);
      return;
    }
    setNoneSelected(false);
    const resultingSelection = isChecked
      ? translateToAllAttachments(includePdf, onlyCurrentTask)
      : translateToSomeAttachments(includePdf, onlyCurrentTask, []);

    handleComponentChange({ ...component, dataTypeIds: resultingSelection });
  };

  const handleValueChanges = (updatedSelection: string[]) => {
    if (updatedSelection.length === 0 && !includePdf) {
      setNoneSelected(true);
      return;
    }
    setNoneSelected(false);
    const isAllAttachmentsSelected: boolean = updatedSelection.length === attachments.length;
    console.log(isAllAttachmentsSelected);
    const resultingSelection = isAllAttachmentsSelected
      ? translateToAllAttachments(includePdf, onlyCurrentTask)
      : translateToSomeAttachments(includePdf, onlyCurrentTask, updatedSelection);
    console.log(resultingSelection);
    handleComponentChange({ ...component, dataTypeIds: resultingSelection });
  };

  return (
    <>
      <Label htmlFor={'attachmentList'}>
        {t('ux_editor.component_properties.select_attachments')}
      </Label>
      <Checkbox
        size='small'
        checked={!noneSelected && selectedAttachments.length === attachments.length}
        indeterminate={
          selectedAttachments.length > 0 && selectedAttachments.length < attachments.length
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
        value={!noneSelected ? selectedAttachments : []}
        onValueChange={handleValueChanges}
        error={noneSelected && t('ux_editor.component_title.AttachmentList_error')}
      >
        {attachments?.map((attachment) => {
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
