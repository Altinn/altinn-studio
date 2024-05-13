import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../../../utils/customReceiptUtils';

export type SelectCustomReceiptDatamodelIdProps = {
  error: string;
  onChange: () => void;
};

export const SelectCustomReceiptDatamodelId = ({
  error,
  onChange,
}: SelectCustomReceiptDatamodelIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, availableDataModelIds } =
    useBpmnApiContext();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );
  const options = existingDatamodelId
    ? [...availableDataModelIds, existingDatamodelId]
    : availableDataModelIds;

  const availableDatamodelIdsEmpty: boolean = options.length === 0;

  return (
    <StudioNativeSelect
      label={t('process_editor.configuration_panel_custom_receipt_select_datamodel_label')}
      size='small'
      description={
        availableDatamodelIdsEmpty &&
        t('process_editor.configuration_panel_custom_receipt_select_datamodel_description')
      }
      name='customReceiptDatamodel'
      id='customReceiptDataModelSelect'
      disabled={availableDatamodelIdsEmpty}
      defaultValue={existingDatamodelId ?? 'noModelKey'}
      error={error}
      onChange={onChange}
    >
      <option disabled={true} value='noModelKey'>
        {t('process_editor.configuration_panel_select_datamodel')}
      </option>
      {options.map((id: string) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
