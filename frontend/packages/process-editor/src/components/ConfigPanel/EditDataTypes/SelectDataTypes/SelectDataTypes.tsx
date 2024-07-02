import React from 'react';
import { Combobox } from '@digdir/design-system-react';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
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

  return (
    <div className={classes.dataTypeSelectAndButtons}>
      <Combobox
        label={t('process_editor.configuration_panel_set_data_model')}
        value={currentValue && dataModelIds.includes(existingDataType) ? currentValue : undefined}
        description={t('process_editor.configuration_panel_data_model_selection_description')}
        size='small'
        className={classes.dataTypeSelect}
      >
        <Combobox.Empty>
          {t('process_editor.configuration_panel_no_data_model_to_select')}
        </Combobox.Empty>
        {dataModelOptionsToDisplay.map((option) => (
          <Combobox.Option
            value={option}
            key={option}
            onClick={() => handleChangeDataModel([option])}
          >
            {option}
          </Combobox.Option>
        ))}
      </Combobox>
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          size='small'
          title={t('general.close')}
          variant='secondary'
        />
        {!hideDeleteButton && (
          <StudioDeleteButton
            onDelete={handleChangeDataModel}
            size='small'
            title={t('general.delete')}
          />
        )}
      </div>
    </div>
  );
};
