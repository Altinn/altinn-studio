import React from 'react';
import { StudioSuggestion, StudioDeleteButton, StudioButton } from '@studio/components';
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

  const handleSelectedChange = (items: { value: string }[]) => {
    const selectedValues = items.map((item) => item.value);
    handleChangeDataModel(selectedValues);
  };

  const dataModelOptionsToDisplay: string[] = existingDataType
    ? [...new Set([...dataModelIds, existingDataType])]
    : dataModelIds;

  const descriptionText = existingDataType
    ? t('process_editor.configuration_panel_data_model_selection_description_existing_model')
    : t('process_editor.configuration_panel_data_model_selection_description');

  const selectedItems =
    existingDataType && dataModelOptionsToDisplay.includes(existingDataType)
      ? [{ value: existingDataType, label: existingDataType }]
      : [];

  return (
    <div className={classes.dataTypeSelectAndButtons}>
      <StudioSuggestion
        label={t('process_editor.configuration_panel_set_data_model_label')}
        description={descriptionText}
        selected={selectedItems}
        emptyText={t('process_editor.configuration_panel_no_data_model_to_select')}
        className={classes.dataTypeSelect}
        filter={() => true}
        onSelectedChange={handleSelectedChange}
      >
        {dataModelOptionsToDisplay.map((option) => (
          <StudioSuggestion.Option value={option} key={option} label={option}>
            {option}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          title={t('general.close')}
          variant='secondary'
        />
        {!hideDeleteButton && (
          <StudioDeleteButton onDelete={handleChangeDataModel} title={t('general.delete')} />
        )}
      </div>
    </div>
  );
};
