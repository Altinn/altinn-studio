import React from 'react';
import { useTranslation } from 'react-i18next';
import { useResetState } from '@studio/hooks';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';

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

  const [selectedValue, setSelectedValue] = useResetState(
    existingDataModelId || '',
    existingDataModelId,
  );

  const handleSelectedChange = (item: StudioSuggestionItem | null) => {
    const newValue = item?.value ?? '';
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
      selected={selectedValue || undefined}
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
