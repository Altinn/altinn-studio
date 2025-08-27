import React, { useId, useState } from 'react';
import { Combobox, Label } from '@digdir/designsystemet-react';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from 'libs/studio-icons/src';
import classes from './SelectDataTypesToSign.module.css';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { StudioModeler } from '../../../../../utils/bpmnModeler/StudioModeler';
import { useGetDataTypesToSign } from '../../../../../hooks/dataTypesToSign/useGetDataTypesToSign';
import { useUpdateDataTypesToSign } from '../../../../../hooks/dataTypesToSign/useUpdateDataTypesToSign';

export interface SelectDataTypesToSignProps {
  onClose: () => void;
}

export const SelectDataTypesToSign = ({ onClose }: SelectDataTypesToSignProps) => {
  const { availableDataTypeIds } = useBpmnApiContext();
  const updateDataTypesToSign = useUpdateDataTypesToSign();
  const selectedDataTypes = useGetDataTypesToSign();
  const [value, setValue] = useState<string[]>(() => selectedDataTypes);

  const { t } = useTranslation();
  const labelId = useId();

  const handleValueChange = (dataTypes: string[]) => {
    setValue(dataTypes);
    updateDataTypesToSign(dataTypes);
  };

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');
  const signingDataTypeIds = tasks
    .filter((item) => item.businessObject.extensionElements?.values[0]?.taskType === 'signing')
    .map(
      (item) =>
        item.businessObject.extensionElements?.values[0]?.signatureConfig?.signatureDataType,
    );

  const filteredDataTypeIds = availableDataTypeIds.filter(
    (dataTypeId) => !signingDataTypeIds.includes(dataTypeId),
  );

  return (
    <div className={classes.container}>
      <Label size='small' htmlFor={labelId}>
        {t('process_editor.configuration_panel_set_data_types_to_sign')}
      </Label>
      <div className={classes.dataTypeSelectAndButtons}>
        <Combobox
          id={labelId}
          value={value}
          size='small'
          className={classes.dataTypeSelect}
          multiple
          onValueChange={handleValueChange}
          error={
            !value.length && t('process_editor.configuration_panel_data_types_to_sign_required')
          }
        >
          <Combobox.Empty>
            {t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
          </Combobox.Empty>
          {filteredDataTypeIds?.map((dataTypeId) => {
            return (
              <Combobox.Option key={dataTypeId} value={dataTypeId}>
                {dataTypeId}
              </Combobox.Option>
            );
          })}
        </Combobox>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          title={t('general.close')}
          variant='secondary'
          disabled={!value.length}
        />
      </div>
    </div>
  );
};
