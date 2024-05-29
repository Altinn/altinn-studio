import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import {
  getDataTypeFromLayoutSetsWithExistingId,
  getDataModelOptions,
} from '../../../../../../utils/configPanelUtils';

export type SelectCustomReceiptDataModelIdProps = {
  error: string;
  onChange: () => void;
};

export const SelectCustomReceiptDataModelId = ({
  error,
  onChange,
}: SelectCustomReceiptDataModelIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, availableDataModelIds } =
    useBpmnApiContext();

  const existingDataModelId: string = getDataTypeFromLayoutSetsWithExistingId(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const dataModelOptions = getDataModelOptions(availableDataModelIds, existingDataModelId);

  const availableDataModelIdsEmpty: boolean = dataModelOptions.length === 0;

  return (
    <StudioNativeSelect
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      size='small'
      description={
        availableDataModelIdsEmpty &&
        t('process_editor.configuration_panel_custom_receipt_select_data_model_description')
      }
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      disabled={availableDataModelIdsEmpty}
      defaultValue={existingDataModelId ?? 'noModelKey'}
      error={error}
      onChange={onChange}
    >
      <option disabled={true} value='noModelKey'>
        {t('process_editor.configuration_panel_select_data_model')}
      </option>
      {dataModelOptions.map((id: string) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
