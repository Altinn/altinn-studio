import { useState } from 'react';
import { StudioButton, StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useDebounce } from '@studio/hooks';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
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

  const selectedItems: StudioSuggestionItem[] = value.map((dataTypeId) => ({
    value: dataTypeId,
    label: signingTasks.find((task) => task.id === dataTypeId)?.name ?? dataTypeId,
  }));

  const handleSelectedChange = (items: StudioSuggestionItem[]) => {
    const dataTypes = items.map((item) => item.value);
    setValue(dataTypes);
    const modelerInstance = modelerRef.current;
    const modeling: Modeling = modelerInstance.get('modeling');
    const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
    debounce(() => updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes));
  };

  return (
    <div className={classes.container}>
      <div className={classes.dataTypeSelectAndButton}>
        <StudioSuggestion
          multiple
          label={t('process_editor.configuration_panel_set_unique_from_signatures_in_data_types')}
          selected={selectedItems}
          emptyText={t('general.no_options')}
          className={classes.dataTypeSelect}
          onSelectedChange={handleSelectedChange}
        >
          {signingTasks?.map((signingTask) => (
            <StudioSuggestion.Option
              key={signingTask.id}
              value={signingTask.id}
              label={signingTask.name}
            >
              {signingTask.name}
            </StudioSuggestion.Option>
          ))}
        </StudioSuggestion>
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
