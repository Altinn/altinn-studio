import React from 'react';
import { StudioButton, StudioCombobox } from '@studio/components-legacy';
import { StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataTypes.module.css';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';

export interface SelectDataTypesProps {
  dataModelIds: string[];
  existingDataType: string;
  connectedTaskId: string;
  onClose: () => void;
  hideDeleteButton?: boolean;
}

export const SelectDataTypes = ({
  dataModelIds,
  existingDataType,
  connectedTaskId,
  onClose,
  hideDeleteButton,
}: SelectDataTypesProps): React.ReactElement => {
  const { t } = useTranslation();
  const { mutateDataTypes } = useBpmnApiContext();
  const currentValue = existingDataType ? [existingDataType] : [];

  const handleChangeDataModel = (newDataModelIds?: string[]) => {
    const newDataModelId = newDataModelIds ? newDataModelIds[0] : undefined;
    if (newDataModelId !== existingDataType) {
      const dataTypesChange: DataTypesChange = {
        newDataTypes: [newDataModelId],
        connectedTaskId,
      };
      mutateDataTypes(dataTypesChange);
    }
    onClose();
  };

  const dataModelOptionsToDisplay: string[] = existingDataType
    ? [...new Set([...dataModelIds, existingDataType])]
    : dataModelIds;

  const descriptionText = existingDataType
    ? t('process_editor.configuration_panel_data_model_selection_description_existing_model')
    : t('process_editor.configuration_panel_data_model_selection_description');

  const value =
    existingDataType && dataModelOptionsToDisplay.includes(existingDataType)
      ? currentValue
      : undefined;

  return (
    <div className={classes.dataTypeSelectAndButtons}>
      <StudioCombobox
        label={t('process_editor.configuration_panel_set_data_model_label')}
        value={value}
        description={descriptionText}
        size='small'
        className={classes.dataTypeSelect}
      >
        <StudioCombobox.Empty>
          {t('process_editor.configuration_panel_no_data_model_to_select')}
        </StudioCombobox.Empty>
        {dataModelOptionsToDisplay.map((option) => (
          <StudioCombobox.Option
            value={option}
            key={option}
            onClick={() => handleChangeDataModel([option])}
          >
            {option}
          </StudioCombobox.Option>
        ))}
      </StudioCombobox>
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          title={t('general.close')}
          variant='secondary'
        />
        {!hideDeleteButton && (
          <StudioDeleteButton
            onDelete={handleChangeDataModel}
            data-size='xs'
            title={t('general.delete')}
          />
        )}
      </div>
    </div>
  );
};
