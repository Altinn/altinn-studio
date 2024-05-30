import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { NO_MODEL_KEY } from '../../../../../../constants';

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
  const allDataModelIdsEmpty: boolean = allDataModelIds.length === 0;

  return (
    <StudioNativeSelect
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      size='small'
      description={
        allDataModelIdsEmpty &&
        t('process_editor.configuration_panel_custom_receipt_select_data_model_description')
      }
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      disabled={allDataModelIdsEmpty}
      defaultValue={existingDataModelId ?? NO_MODEL_KEY}
      error={error}
      onChange={onChange}
    >
      <option disabled={true} value={NO_MODEL_KEY}>
        {t('process_editor.configuration_panel_select_data_model')}
      </option>
      {allDataModelIds.map((id: string) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
