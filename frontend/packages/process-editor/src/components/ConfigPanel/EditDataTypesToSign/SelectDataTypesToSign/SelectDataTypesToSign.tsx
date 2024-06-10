import React, { useState } from 'react';
import { Combobox } from '@digdir/design-system-react';
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

  const handleValueChange = (dataTypes: string[]) => {
    setValue(dataTypes);
    debounce(() => updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes));
  };

  return (
    <div className={classes.dataTypeSelectAndButtons}>
      <Combobox
        label={t('process_editor.configuration_panel_set_data_types_to_sign')}
        value={value}
        size='small'
        className={classes.dataTypeSelect}
        multiple
        onValueChange={handleValueChange}
        error={!value.length && t('process_editor.configuration_panel_data_types_to_sign_required')}
      >
        <Combobox.Empty>
          {t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
        </Combobox.Empty>
        {availableDataTypeIds?.map((dataTypeId) => {
          return (
            <Combobox.Option key={dataTypeId} value={dataTypeId}>
              {dataTypeId}
            </Combobox.Option>
          );
        })}
      </Combobox>
      <div className={classes.buttons}>
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
