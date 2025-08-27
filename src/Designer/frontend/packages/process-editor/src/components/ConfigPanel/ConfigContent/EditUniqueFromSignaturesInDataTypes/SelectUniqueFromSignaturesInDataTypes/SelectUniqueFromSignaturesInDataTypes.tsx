import React, { useId, useState } from 'react';
import { Combobox, Label } from '@digdir/designsystemet-react';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { useDebounce } from 'libs/studio-hooks/src';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from 'libs/studio-icons/src';
import classes from './SelectUniqueFromSignaturesInDataTypes.module.css';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { updateDataTypes, getSelectedDataTypes } from '../UniqueFromSignaturesInDataTypesUtils';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { StudioModeler } from '../../../../../utils/bpmnModeler/StudioModeler';

export interface SelectUniqueFromSignaturesInDataTypesProps {
  onClose: () => void;
}

export const SelectUniqueFromSignaturesInDataTypes = ({
  onClose,
}: SelectUniqueFromSignaturesInDataTypesProps) => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');
  const signingTasks = tasks
    .filter(
      ({
        businessObject: {
          extensionElements: { values },
        },
        id,
      }) => {
        const { taskType } = values[0];
        return taskType === 'signing' && id !== bpmnDetails.id;
      },
    )
    .map(
      ({
        businessObject: {
          name,
          extensionElements: { values },
        },
      }) => {
        const { signatureConfig } = values[0];
        return {
          id: signatureConfig?.signatureDataType,
          name,
        };
      },
    );

  const [value, setValue] = useState<string[]>(() =>
    getSelectedDataTypes(bpmnDetails).filter((item) =>
      signingTasks.some((task) => task.id === item),
    ),
  );
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });
  const { t } = useTranslation();
  const labelId = useId();

  const handleValueChange = (dataTypes: string[]) => {
    setValue(dataTypes);
    debounce(() => updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes));
  };

  return (
    <div className={classes.container}>
      <Label size='small' htmlFor={labelId}>
        {t('process_editor.configuration_panel_set_unique_from_signatures_in_data_types')}
      </Label>
      <div className={classes.dataTypeSelectAndButtons}>
        <Combobox
          id={labelId}
          value={value}
          size='small'
          className={classes.dataTypeSelect}
          multiple
          onValueChange={handleValueChange}
        >
          {signingTasks?.map((signingTask) => {
            return (
              <Combobox.Option key={signingTask.id} value={signingTask.id}>
                {signingTask.name}
              </Combobox.Option>
            );
          })}
        </Combobox>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          title={t('general.close')}
          variant='secondary'
        />
      </div>
    </div>
  );
};
