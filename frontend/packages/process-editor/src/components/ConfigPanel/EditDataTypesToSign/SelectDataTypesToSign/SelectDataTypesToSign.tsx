import React, { useId, useState } from 'react';
import { Combobox, Label } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataTypesToSign.module.css';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { updateDataTypes, getSelectedDataTypes } from '../DataTypesToSignUtils';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useDebounce } from 'app-shared/hooks/useDebounce';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';

export interface SelectDataTypesToSignProps {
  onClose: () => void;
}

export const SelectDataTypesToSign = ({ onClose }: SelectDataTypesToSignProps) => {
  const { availableDataTypeIds } = useBpmnApiContext();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
  const [value, setValue] = useState<string[]>(() => getSelectedDataTypes(bpmnDetails));
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  const { t } = useTranslation();
  const labelId = useId();

  const handleValueChange = (dataTypes: string[]) => {
    setValue(dataTypes);
    debounce(() => updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes));
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
          size='small'
          title={t('general.close')}
          variant='secondary'
          disabled={!value.length}
        />
      </div>
    </div>
  );
};
