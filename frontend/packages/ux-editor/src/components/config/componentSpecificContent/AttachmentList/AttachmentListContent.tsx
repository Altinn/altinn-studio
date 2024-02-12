import React from 'react';
import { Combobox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { IGenericEditComponent } from '../../componentConfig';
import classes from './AttachmentListContent.module.css';

type IAttachmentListContent = IGenericEditComponent & {
  selectedAttachments: string[];
  attachments: string[];
  onlyCurrentTask: boolean;
  includePdf: boolean;
};

export const AttachmentListContent = ({
  component,
  handleComponentChange,
  selectedAttachments,
  attachments,
  onlyCurrentTask,
  includePdf,
}: IAttachmentListContent) => {
  const { t } = useTranslation();

  const handleValueChanges = (updatedSelection: string[]) => {
    const lastSelected = updatedSelection[updatedSelection.length - 1];

    updatedSelection =
      lastSelected === 'include-all'
        ? ['include-all']
        : updatedSelection.filter((dataType) => dataType !== 'include-all');

    if (onlyCurrentTask) {
      updatedSelection.push('current-task');
    }
    if (includePdf) {
      updatedSelection.push('ref-data-as-pdf');
    }

    handleComponentChange({ ...component, dataTypeIds: updatedSelection });
  };

  const getDescription = (dataType: string) => {
    return dataType === 'include-all'
      ? t('ux_editor.component_properties.select_all_attachments')
      : dataType;
  };

  return (
    <Combobox
      multiple
      label={t('ux_editor.component_properties.select_attachments')}
      className={classes.comboboxLabel}
      size='small'
      value={selectedAttachments.length === 0 ? ['include-all'] : selectedAttachments}
      onValueChange={handleValueChanges}
    >
      {attachments?.map((attachment) => {
        return (
          <Combobox.Option
            key={attachment}
            value={attachment}
            description={getDescription(attachment)}
            displayValue={getDescription(attachment)}
          />
        );
      })}
    </Combobox>
  );
};
