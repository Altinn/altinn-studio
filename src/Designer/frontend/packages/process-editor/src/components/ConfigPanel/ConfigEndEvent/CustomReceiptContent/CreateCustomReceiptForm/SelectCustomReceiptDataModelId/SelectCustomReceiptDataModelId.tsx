import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { StudioSuggestion } from '@studio/components';

export type SelectCustomReceiptDataModelIdProps = {
  error: string;
  onChange: (value: string) => void;
};

export const SelectCustomReceiptDataModelId = ({
  error,
  onChange,
}: SelectCustomReceiptDataModelIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, allDataModelIds } = useBpmnApiContext();

  const existingDataModelId: string = getDataTypeFromLayoutSetsWithExistingId(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const [selectedValue, setSelectedValue] = useState<string>(existingDataModelId || '');

  useEffect(() => {
    if (existingDataModelId) {
      setSelectedValue(existingDataModelId);
    }
  }, [existingDataModelId]);

  const selectedItem = selectedValue ? { value: selectedValue, label: selectedValue } : undefined;

  const handleSelectedChange = (item: { value: string }) => {
    const newValue = item?.value || '';
    setSelectedValue(newValue);
    onChange(newValue);
  };

  return (
    <StudioSuggestion
      multiple={false}
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      emptyText={t('process_editor.configuration_panel_no_data_model_to_select')}
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      error={error}
      selected={selectedItem}
      onSelectedChange={handleSelectedChange}
    >
      {allDataModelIds.map((option) => (
        <StudioSuggestion.Option value={option} key={option}>
          {option}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
