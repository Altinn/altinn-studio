import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { StudioSuggestion } from '@studio/components';

export type SelectCustomReceiptDataModelIdProps = {
  error: string;
  onChange: () => void;
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

  const selectedItems = selectedValue ? [{ value: selectedValue, label: selectedValue }] : [];

  const handleSelectedChange = (items: { value: string }[]) => {
    const newValue = items[0]?.value || '';
    setSelectedValue(newValue);
    onChange();
  };

  return (
    <StudioSuggestion
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      emptyText={t('process_editor.configuration_panel_no_data_model_to_select')}
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      error={error}
      selected={selectedItems}
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
