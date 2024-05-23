import React from 'react';
import { Combobox } from '@digdir/design-system-react';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
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
  const currentValue = existingDataType ? [existingDataType] : [];
  const handleChangeDataModel = (newDataModelIds?: string[]) => {
    const newDataModelId = newDataModelIds ? newDataModelIds[0] : undefined;
    if (newDataModelId !== existingDataType) {
      const dataTypeChange: DataTypeChange = {
        newDataType: newDataModelId,
        connectedTaskId: connectedTaskId,
      };
      mutateDataType(dataTypeChange);
    }
    onClose();
  };

  return (
    <div className={classes.dataTypeSelect}>
      <Combobox
        label={t('process_editor.configuration_panel_set_datamodel')}
        value={currentValue}
        description={t('process_editor.configuration_panel_datamodel_selection_description')}
      >
        <Combobox.Empty>
          {t('process_editor.configuration_panel_no_datamodel_to_select')}
        </Combobox.Empty>
        {datamodelIds.map((option) => (
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
