import React from 'react';
import classes from './CreateCustomReceiptForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../../types/CustomReceiptType';
import { type DataTypeChange } from 'app-shared/types/api/DataTypeChange';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { SelectCustomReceiptDatamodelId } from './SelectCustomReceiptDatamodelId';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../../utils/customReceiptUtils';

export type CreateCustomReceiptFormProps = {
  onCloseForm: () => void;
};

export const CreateCustomReceiptForm = ({
  onCloseForm,
}: CreateCustomReceiptFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, addLayoutSet, mutateDataType } =
    useBpmnApiContext();

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
        label={t('process_editor.configuration_panel_custom_receipt_textfield_label')}
        value={existingCustomReceiptLayoutSetId}
        size='small'
        // error - TODO
        // onChange - TODO
      />
      <SelectCustomReceiptDatamodelId />
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' type='submit' variant='primary'>
          {t(
            `process_editor.configuration_panel_custom_receipt_${!existingCustomReceiptLayoutSetId ? 'create' : 'save'}_button`,
          )}
        </StudioButton>
        <StudioButton size='small' onClick={onCloseForm} variant='secondary'>
          {t('process_editor.configuration_panel_custom_receipt_cancel_button')}
        </StudioButton>
      </div>
    </form>
  );
};
