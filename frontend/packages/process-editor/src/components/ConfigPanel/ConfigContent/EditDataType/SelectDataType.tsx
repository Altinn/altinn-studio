import React from 'react';
import { NativeSelect } from '@digdir/design-system-react';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataType.module.css';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export interface SelectDataTypeProps {
  dataModelIds: string[];
  existingDataType: string;
  connectedTaskId: string;
  onClose: () => void;
}
export const SelectDataType = ({
  dataModelIds,
  existingDataType,
  connectedTaskId,
  onClose,
}: SelectDataTypeProps) => {
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
      <NativeSelect
        size='small'
        onChange={({ target }) => handleChangeDataModel(target.value)}
        label={t('process_editor.configuration_panel_set_datamodel')}
        value={existingDataType ?? 'noModelKey'}
      >
        <option disabled={true} value={'noModelKey'}>
          {t('process_editor.configuration_panel_select_datamodel')}
        </option>
        {dataModelIds.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          size='small'
          title={t('general.close')}
          variant='secondary'
        />
        <StudioDeleteButton
          onDelete={handleChangeDataModel}
          size='small'
          title={t('general.delete')}
        />
      </div>
    </div>
  );
};
