import React from 'react';
import classes from './CustomReceiptForm.module.css';
// import { useTranslation } from 'react-i18next';
import { StudioButton, StudioTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../types/CustomReceiptType';
import { type DataTypeChange } from 'app-shared/types/api/DataTypeChange';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { SelectCustomReceiptDatamodelId } from './SelectCustomReceiptDatamodelId';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../utils/customReceiptUtils';

export type CustomReceiptFormProps = {
  onCloseForm: () => void;
};

export const CustomReceiptForm = ({ onCloseForm }: CustomReceiptFormProps): React.ReactElement => {
  const {
    layoutSets,
    existingCustomReceiptLayoutSetId,
    addLayoutSet,
    mutateLayoutSet,
    mutateDataType,
  } = useBpmnApiContext();

  // const { t } = useTranslation();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

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
    const isSameLayoutId: boolean = existingCustomReceiptLayoutSetId === customReceipt.layoutSetId;
    const isSameDatamodelId: boolean = existingDatamodelId === customReceipt.datamodelId;

    if (isSameLayoutId && isSameDatamodelId) return;

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
    console.log('inside save edit');
    mutateLayoutSet(
      {
        layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
        newLayoutSetId: customReceipt.layoutSetId,
      },
      {
        onSuccess: () => {
          console.log('inside success');
          saveDatamodel(customReceipt.datamodelId);
        },
      },
    );
  };

  const saveDatamodel = (datamodelId: string) => {
    console.log('inside save datamodel');
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
      <SelectCustomReceiptDatamodelId />
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
