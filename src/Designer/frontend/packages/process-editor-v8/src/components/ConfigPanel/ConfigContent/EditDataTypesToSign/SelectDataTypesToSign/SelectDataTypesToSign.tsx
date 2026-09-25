import { useState } from 'react';
import { StudioButton, StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
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

  const handleSelectedChange = (items: StudioSuggestionItem[]) => {
    const dataTypes = items.map((item) => item.value);
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
      <div className={classes.dataTypeSelectAndButton}>
        <StudioSuggestion
          multiple
          label={t('process_editor.configuration_panel_set_data_types_to_sign')}
          selected={value}
          emptyText={t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
          className={classes.dataTypeSelect}
          onSelectedChange={handleSelectedChange}
          error={
            !value.length && t('process_editor.configuration_panel_data_types_to_sign_required')
          }
        >
          {filteredDataTypeIds?.map((dataTypeId) => (
            <StudioSuggestion.Option key={dataTypeId} value={dataTypeId} label={dataTypeId}>
              {dataTypeId}
            </StudioSuggestion.Option>
          ))}
        </StudioSuggestion>
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
