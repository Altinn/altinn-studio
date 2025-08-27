import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { StudioCombobox } from '@studio/components-legacy';

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

  return (
    <StudioCombobox
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      size='small'
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      error={error}
      value={existingDataModelId && [existingDataModelId]}
      onValueChange={() => onChange()}
    >
      <StudioCombobox.Empty>
        {t('process_editor.configuration_panel_no_data_model_to_select')}
      </StudioCombobox.Empty>
      {allDataModelIds.map((option) => (
        <StudioCombobox.Option value={option} key={option}>
          {option}
        </StudioCombobox.Option>
      ))}
    </StudioCombobox>
  );
};
