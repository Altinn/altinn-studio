import React from 'react';
import { StudioButton, StudioDeleteButton, StudioNativeSelect } from '@studio/components';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataType.module.css';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export interface SelectDataTypeProps {
  datamodelIds: string[];
  existingDataType: string;
  connectedTaskId: string;
  onClose: () => void;
  hideDeleteButton?: boolean;
}
export const SelectDataType = ({
  datamodelIds,
  existingDataType,
  connectedTaskId,
  onClose,
  hideDeleteButton,
}: SelectDataTypeProps): React.ReactElement => {
  const { t } = useTranslation();
  const { mutateDataType } = useBpmnApiContext();
  const handleChangeDataModel = (dataModelId?: string) => {
    if (dataModelId === existingDataType) return;
    const dataTypeChange: DataTypeChange = {
      newDataType: dataModelId,
      connectedTaskId: connectedTaskId,
    };
    mutateDataType(dataTypeChange);
    onClose();
  };

  return (
    <div className={classes.dataTypeSelect}>
      <StudioNativeSelect
        size='small'
        onChange={({ target }) => handleChangeDataModel(target.value)}
        label={t('process_editor.configuration_panel_set_datamodel')}
        value={existingDataType ?? 'noModelKey'}
      >
        <option disabled={true} value={'noModelKey'}>
          {t('process_editor.configuration_panel_select_datamodel')}
        </option>
        {datamodelIds.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </StudioNativeSelect>
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
