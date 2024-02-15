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
  reservedDataTypes: {
    currentTask: string;
    refDataAsPdf: string;
    includeAll: string;
  };
};

export const AttachmentListContent = ({
  component,
  handleComponentChange,
  selectedAttachments,
  attachments,
  onlyCurrentTask,
  includePdf,
  reservedDataTypes,
}: IAttachmentListContent) => {
  const { t } = useTranslation();

  const handleValueChanges = (updatedSelection: string[]) => {
    const lastSelected = updatedSelection[updatedSelection.length - 1];

    updatedSelection =
      lastSelected === reservedDataTypes.currentTask
        ? [reservedDataTypes.currentTask]
        : updatedSelection.filter((dataType) => dataType !== reservedDataTypes.includeAll);

    if (onlyCurrentTask) {
      updatedSelection.push(reservedDataTypes.currentTask);
    }
    if (includePdf) {
      updatedSelection.push(reservedDataTypes.refDataAsPdf);
    }

    handleComponentChange({ ...component, dataTypeIds: updatedSelection });
  };

  const getTextToDisplay = (dataType: string) =>
    dataType === reservedDataTypes.includeAll
      ? t('ux_editor.component_properties.select_all_attachments')
      : dataType;

  return (
    <Combobox
      multiple
      label={t('ux_editor.component_properties.select_attachments')}
      className={classes.comboboxLabel}
      size='small'
      value={
        selectedAttachments.length === 0 ? [reservedDataTypes.includeAll] : selectedAttachments
      }
      onValueChange={handleValueChanges}
    >
      {attachments?.map((attachment) => {
        return (
          <Combobox.Option
            key={attachment}
            value={attachment}
            description={getTextToDisplay(attachment)}
            displayValue={getTextToDisplay(attachment)}
          />
        );
      })}
    </Combobox>
  );
};
