import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../../utils/customReceiptUtils';

export const SelectCustomReceiptDatamodelId = (): React.ReactElement => {
  const { layoutSets, existingCustomReceiptLayoutSetId, availableDataModelIds } =
    useBpmnApiContext();
  const { t } = useTranslation();

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
      label='Datamodelknytning'
      size='small'
      description={
        availableDatamodelIdsEmpty &&
        'Du må ha noen ledige datamodeller du kan knytte mot kvitteringen for at det skal visesnoen i listen under.'
      }
      name='customReceiptDatamodel'
      id='customReceiptDataModelSelect'
      disabled={availableDatamodelIdsEmpty}
      defaultValue={existingDatamodelId ?? 'noModelKey'}
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
