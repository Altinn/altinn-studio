import React, { useState } from 'react';
import { Fieldset, Switch } from '@digdir/design-system-react';
import { AttachmentListContent } from './AttachmentListContent';
import { useTranslation } from 'react-i18next';
import { selectionIsValid } from './AttachmentListUtils';
import { ArrayUtils } from '@studio/pure-functions';
import type { AttachmentsFormat, InternalDataTypesFormat } from './AttachmentListUtils';

type AttachmentListInternalFormatProps = {
  onChange: (selectedDataTypes: InternalDataTypesFormat) => void;
  availableAttachments: AttachmentsFormat;
  internalDataFormat: InternalDataTypesFormat;
};

export const AttachmentListInternalFormat = (props: AttachmentListInternalFormatProps) => {
  const { onChange, availableAttachments, internalDataFormat } = props;
  const [dataTypes, setDataTypes] = useState<InternalDataTypesFormat>(internalDataFormat);
  const { t } = useTranslation();
  const { includePdf, currentTask } = dataTypes;

  const onChangePdf = (isChecked: boolean) => {
    setDataTypes((prevDataTypes) => ({ ...prevDataTypes, includePdf: isChecked }));
    onChange({ ...dataTypes, includePdf: isChecked });
  };

  const onChangeTask = (isChecked: boolean) => {
    const updatedSelectedDataTypes = handleDataTypesWhenCurrentTaskChange(
      isChecked,
      dataTypes.selectedDataTypes,
      availableAttachments.attachmentsCurrentTasks,
    );

    setDataTypes((prevDataTypes) => ({
      ...prevDataTypes,
      currentTask: isChecked,
      selectedDataTypes: updatedSelectedDataTypes,
    }));
    onChange({
      ...dataTypes,
      currentTask: isChecked,
      selectedDataTypes: updatedSelectedDataTypes,
    });
  };

  return (
    <Fieldset
      legend={t('ux_editor.component_title.AttachmentList_legend')}
      error={!selectionIsValid(dataTypes) && t('ux_editor.component_title.AttachmentList_error')}
    >
      <Switch onChange={(e) => onChangeTask(e.target.checked)} size='small' checked={currentTask}>
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Switch onChange={(e) => onChangePdf(e.target.checked)} size='small' checked={includePdf}>
        {t('ux_editor.component_properties.select_pdf')}
      </Switch>
      <AttachmentListContent
        availableAttachments={availableAttachments}
        dataTypes={dataTypes}
        setDataTypes={setDataTypes}
        onChange={onChange}
      />
    </Fieldset>
  );
};

const handleDataTypesWhenCurrentTaskChange = (
  currentTask: boolean,
  selectedDataTypes: string[],
  attachmentsCurrentTasks: string[],
) => {
  return currentTask
    ? ArrayUtils.intersection(selectedDataTypes, attachmentsCurrentTasks)
    : selectedDataTypes;
};
