import React from 'react';
import { Combobox, Label, Checkbox } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './AttachmentListContent.module.css';

type IAttachmentListContent = {
  currentAvailableAttachments: string[];
  selectedDataTypes: string[];
  onChange: (selectedDataTypes: string[]) => void;
};

export const AttachmentListContent = ({
  currentAvailableAttachments,
  selectedDataTypes,
  onChange,
}: IAttachmentListContent) => {
  const { t } = useTranslation();
  const checkboxInIndeterminateState =
    selectedDataTypes.length > 0 && selectedDataTypes.length < currentAvailableAttachments.length;

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
        onChange={(e) => onChange(e.target.checked ? currentAvailableAttachments : [])}
      >
        {t('ux_editor.component_properties.select_all_attachments')}
      </Checkbox>
      <Combobox
        id={'attachmentList'}
        multiple
        className={classes.comboboxLabel}
        size='small'
        value={selectedDataTypes}
        onValueChange={onChange}
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
