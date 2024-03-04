import React from 'react';
import { Combobox, Label, Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { IGenericEditComponent } from '../../componentConfig';
import classes from './AttachmentListContent.module.css';
import { convertAttachmentsToBackend } from './AttachmentListUtils';

type IAttachmentListContent = IGenericEditComponent & {
  selectedAttachments: string[];
  attachments: string[];
  state: {
    onlyCurrentTask: boolean;
    noneSelected: boolean;
    includePdf: boolean;
  };
  setState: (state: any) => void;
};

export const AttachmentListContent = ({
  component,
  handleComponentChange,
  selectedAttachments,
  attachments,
  state,
  setState,
}: IAttachmentListContent) => {
  const { t } = useTranslation();

  const handleCheckboxChange = (isChecked: boolean) => {
    if (!isChecked && !state.includePdf) {
      setState((preState) => ({ ...preState, noneSelected: true }));
      return;
    }
    setState((preState) => ({ ...preState, noneSelected: false }));
    const resultingSelection = convertAttachmentsToBackend({
      includeAllAttachments: isChecked,
      includePdf: state.includePdf,
      onlyCurrentTask: state.onlyCurrentTask,
      selectedAttachments: [],
    });

    handleComponentChange({ ...component, dataTypeIds: resultingSelection });
  };

  const handleComboboxChange = (updatedSelection: string[]) => {
    if (updatedSelection.length === 0 && !state.includePdf) {
      setState((preState) => ({ ...preState, noneSelected: true }));
      return;
    }
    setState((preState) => ({ ...preState, noneSelected: false }));

    const resultingSelection = convertAttachmentsToBackend({
      includeAllAttachments: updatedSelection.length === attachments.length,
      includePdf: state.includePdf,
      onlyCurrentTask: state.onlyCurrentTask,
      selectedAttachments: updatedSelection,
    });

    handleComponentChange({ ...component, dataTypeIds: resultingSelection });
  };

  return (
    <>
      <Label htmlFor={'attachmentList'}>
        {t('ux_editor.component_properties.select_attachments')}
      </Label>
      <Checkbox
        size='small'
        checked={!state.noneSelected && selectedAttachments.length === attachments.length}
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
        value={!state.noneSelected ? selectedAttachments : []}
        onValueChange={handleComboboxChange}
        error={state.noneSelected && t('ux_editor.component_title.AttachmentList_error')}
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
