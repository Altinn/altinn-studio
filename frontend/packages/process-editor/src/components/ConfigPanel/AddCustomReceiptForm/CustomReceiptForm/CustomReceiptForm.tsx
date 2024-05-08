import React from 'react';
import classes from './CustomReceiptForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioNativeSelect, StudioTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../types/CustomReceiptType';
import { type DataTypeChange } from 'app-shared/types/api/DataTypeChange';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export type CustomReceiptFormProps = {
  existingDataType: string;
  onCloseForm: () => void;
  availableDatamodelIds: string[];
};

export const CustomReceiptForm = ({
  existingDataType,
  onCloseForm,
  availableDatamodelIds,
}: CustomReceiptFormProps): React.ReactElement => {
  const { existingCustomReceiptLayoutSetId, addLayoutSet, mutateLayoutSet, mutateDataType } =
    useBpmnApiContext();

  const { t } = useTranslation();

  const availableDatamodelIdsEmpty: boolean = availableDatamodelIds.length === 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);

    const customReceiptForm: CustomReceiptType = {
      layoutSetId: formData.get('customReceiptLayoutSetId') as string,
      datamodelId: formData.get('customReceiptDatamodel') as string,
    };

    saveCustomReceipt(customReceiptForm);
    onCloseForm();
  };

  const saveCustomReceipt = (customReceipt: CustomReceiptType) => {
    if (existingCustomReceiptLayoutSetId === customReceipt.layoutSetId) return;
    if (!existingCustomReceiptLayoutSetId) {
      createNewCustomReceipt(customReceipt);
      return;
    }
    saveExistingCustomReceipt(customReceipt);
  };

  const createNewCustomReceipt = (customReceipt: CustomReceiptType) => {
    const customReceiptLayoutSetConfig: LayoutSetConfig = {
      id: customReceipt.layoutSetId,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    };
    addLayoutSet(
      {
        layoutSetIdToUpdate: customReceipt.layoutSetId,
        layoutSetConfig: customReceiptLayoutSetConfig,
      },
      {
        onSuccess: () => saveDatamodel(customReceipt.datamodelId),
      },
    );
  };

  const saveExistingCustomReceipt = (customReceipt: CustomReceiptType) => {
    mutateLayoutSet(
      {
        layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
        newLayoutSetId: customReceipt.layoutSetId,
      },
      {
        onSuccess: () => saveDatamodel(customReceipt.datamodelId),
      },
    );
  };

  const saveDatamodel = (datamodelId: string) => {
    const dataTypeChange: DataTypeChange = {
      newDataType: datamodelId,
      connectedTaskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    };
    mutateDataType(dataTypeChange);
  };

  return (
    <form onSubmit={handleSubmit} className={classes.customReceiptForm}>
      <StudioTextfield
        name='customReceiptLayoutSetId'
        label='Navn på sidegruppe'
        value={existingCustomReceiptLayoutSetId}
        size='small'
        // error - TODO
        // onChange - TODO
      />
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
        defaultValue={existingDataType ?? 'noModelKey'}
      >
        <option disabled={true} value={'noModelKey'}>
          {t('process_editor.configuration_panel_select_datamodel')}
        </option>
        {availableDatamodelIds.map((id: string) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </StudioNativeSelect>
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' type='submit' variant='primary'>
          {!existingCustomReceiptLayoutSetId ? 'Opprett' : 'Lagre'}
        </StudioButton>
        <StudioButton size='small' onClick={onCloseForm} variant='secondary'>
          Avbryt
        </StudioButton>
      </div>
    </form>
  );
};
