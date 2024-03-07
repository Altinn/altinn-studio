import React, { useState } from 'react';
import { Switch } from '@digdir/design-system-react';
import { AttachmentListContent } from './AttachmentListContent';
import { useTranslation } from 'react-i18next';
import { ArrayUtils } from '@studio/pure-functions';
import { reservedDataTypes } from './AttachmentListUtils';

type AttachmentListInternalFormatProps = {
  handleOutGoingData: (selectedDataTypes: string[], availableAttachments: string[]) => void;
  internalDataFormat: {
    availableAttachments: string[];
    selectedDataTypes: string[];
  };
};

export const AttachmentListInternalFormat = (props: AttachmentListInternalFormatProps) => {
  const { handleOutGoingData, internalDataFormat } = props;
  const { selectedDataTypes, availableAttachments } = internalDataFormat;
  const { t } = useTranslation();
  const [currentSelectedDataTypes, setCurrentSelectedDataTypes] =
    useState<string[]>(selectedDataTypes);

  const includePdf = selectedDataTypes.includes(reservedDataTypes.refDataAsPdf);
  const currentTask = selectedDataTypes.includes(reservedDataTypes.currentTask);

  const onChangePdf = (isChecked: boolean) => {
    const updatedSelection = toggleItemInArray(
      selectedDataTypes,
      reservedDataTypes.refDataAsPdf,
      isChecked,
    );
    setCurrentSelectedDataTypes(updatedSelection);

    handleOutGoingData(updatedSelection, availableAttachments);
  };

  const onChangeTask = (isChecked: boolean) => {
    const updatedSelection = toggleItemInArray(
      selectedDataTypes,
      reservedDataTypes.currentTask,
      isChecked,
    );
    setCurrentSelectedDataTypes(updatedSelection);

    // let updatedSelectedAttachments: string[];
    // if (isChecked) {
    //   const updatedTasks = currentTasks(layoutSets, selectedLayoutSet);
    //   const updatedAttachments = getAttachments(updatedTasks, appMetadata);
    //   updatedSelectedAttachments = comboboxSelectedAttachments.filter((attachment) =>
    //     updatedAttachments.includes(attachment),
    //   );
    // }

    handleOutGoingData(updatedSelection, availableAttachments);
  };

  return (
    <>
      <Switch onChange={(e) => onChangeTask(e.target.checked)} size='small' checked={currentTask}>
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Switch onChange={(e) => onChangePdf(e.target.checked)} size='small' checked={includePdf}>
        {t('ux_editor.component_properties.select_pdf')}
      </Switch>
      <AttachmentListContent
        availableAttachments={availableAttachments}
        currentSelectedDataTypes={currentSelectedDataTypes}
        setCurrentSelectedDataTypes={setCurrentSelectedDataTypes}
        handleOutGoingData={handleOutGoingData}
      />
    </>
  );
};

const toggleItemInArray = (array: string[], item: string, add: boolean): string[] =>
  add ? array.concat(item) : ArrayUtils.removeItemByValue(array, item);
