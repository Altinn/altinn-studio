import React, { useState } from 'react';
import classes from './CreateCustomReceiptForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../../types/CustomReceiptType';
import { type DataTypeChange } from 'app-shared/types/api/DataTypeChange';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { SelectCustomReceiptDatamodelId } from './SelectCustomReceiptDatamodelId';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';

export type CreateCustomReceiptFormProps = {
  onCloseForm: () => void;
};

export const CreateCustomReceiptForm = ({
  onCloseForm,
}: CreateCustomReceiptFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, addLayoutSet, mutateDataType } =
    useBpmnApiContext();

  const [layoutSetError, setLayoutSetError] = useState<string>(null);
  const [datamodelError, setDatamodelError] = useState<string>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);
    const customReceiptForm: CustomReceiptType = getCustomReceiptFormData(formData);
    const { layoutSetId, datamodelId } = customReceiptForm;

    if (layoutSetId && datamodelId && !layoutSetError) {
      createNewCustomReceipt(customReceiptForm);
    }
    updateErrors(customReceiptForm);
  };

  const getCustomReceiptFormData = (formData: FormData): CustomReceiptType => {
    const layoutSetId = formData.get('customReceiptLayoutSetId') as string;
    const datamodelId = formData.get('customReceiptDatamodel') as string;
    return { layoutSetId, datamodelId };
  };

  const updateErrors = (customReceiptForm: CustomReceiptType) => {
    const { layoutSetId, datamodelId } = customReceiptForm;
    setLayoutSetError(!layoutSetId ? t('validation_errors.required') : null);
    setDatamodelError(
      !datamodelId
        ? t('process_editor.configuration_panel_custom_receipt_create_datamodel_error')
        : null,
    );
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
    mutateDataType(dataTypeChange, {
      onSuccess: onCloseForm,
    });
  };

  const handleValidateLayoutSetId = (event: React.ChangeEvent<HTMLInputElement>) => {
    const validationResult = getLayoutSetIdValidationErrorKey(
      layoutSets,
      existingCustomReceiptLayoutSetId,
      event.target.value,
    );
    setLayoutSetError(validationResult ? t(validationResult) : null);
  };

  return (
    <form onSubmit={handleSubmit} className={classes.customReceiptForm}>
      <StudioTextfield
        name='customReceiptLayoutSetId'
        label={t('process_editor.configuration_panel_custom_receipt_textfield_label')}
        value={existingCustomReceiptLayoutSetId}
        size='small'
        error={layoutSetError}
        onChange={handleValidateLayoutSetId}
      />
      <SelectCustomReceiptDatamodelId
        error={datamodelError}
        onChange={() => setDatamodelError(null)}
      />
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' type='submit' variant='primary'>
          {t('process_editor.configuration_panel_custom_receipt_create_button')}
        </StudioButton>
        <StudioButton size='small' onClick={onCloseForm} variant='secondary'>
          {t('process_editor.configuration_panel_custom_receipt_cancel_button')}
        </StudioButton>
      </div>
    </form>
  );
};
