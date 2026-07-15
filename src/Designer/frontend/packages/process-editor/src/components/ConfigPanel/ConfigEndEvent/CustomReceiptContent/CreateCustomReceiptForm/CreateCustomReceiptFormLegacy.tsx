import React, { useState } from 'react';
import classes from './CreateCustomReceiptForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../../types/CustomReceiptType';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { SelectCustomReceiptDataModelId } from './SelectCustomReceiptDataModelId';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { createNewCustomReceipt } from '../CustomReceiptUtils';

export type CreateCustomReceiptFormLegacyProps = {
  addCustomReceipt: (customReceipt: LayoutSetConfig) => void;
  onCloseForm: () => void;
  hasAvailableDataModels: boolean;
};

export const CreateCustomReceiptFormLegacy = ({
  addCustomReceipt,
  onCloseForm,
  hasAvailableDataModels,
}: CreateCustomReceiptFormLegacyProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const [layoutSetError, setLayoutSetError] = useState<string>(null);
  const [dataModelError, setDataModelError] = useState<string>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);
    const customReceiptForm: CustomReceiptType = getCustomReceiptFormData(formData);
    const { layoutSetId, dataModelId } = customReceiptForm;

    if (layoutSetId && dataModelId && !layoutSetError) {
      const customReceipt = createNewCustomReceipt(customReceiptForm, false);
      addCustomReceipt(customReceipt);
    }
    updateErrors(customReceiptForm);
  };

  const getCustomReceiptFormData = (formData: FormData): CustomReceiptType => {
    const layoutSetId = formData.get('customReceiptLayoutSetId') as string;
    const dataModelId = formData.get('customReceiptDataModel') as string;
    return { layoutSetId, dataModelId };
  };

  const updateErrors = (customReceiptForm: CustomReceiptType) => {
    const { layoutSetId, dataModelId } = customReceiptForm;
    setLayoutSetError(!layoutSetId ? t('validation_errors.required') : null);
    layoutSetId.length === 1 &&
      setLayoutSetError(
        t('process_editor.configuration_panel_custom_receipt_layout_set_name_validation'),
      );

    setDataModelError(
      !dataModelId
        ? t('process_editor.configuration_panel_custom_receipt_create_data_model_error')
        : null,
    );
  };

  const handleValidateLayoutSetId = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLayoutSetError(validateLayoutSetName(event.target.value, layoutSets));
  };

  return (
    <form onSubmit={handleSubmit} className={classes.customReceiptForm}>
      <StudioTextfield
        name='customReceiptLayoutSetId'
        label={t('process_editor.configuration_panel_custom_receipt_textfield_label')}
        value={existingCustomReceiptLayoutSetId}
        error={layoutSetError}
        onChange={handleValidateLayoutSetId}
      />
      <SelectCustomReceiptDataModelId
        error={dataModelError}
        onChange={() => setDataModelError(null)}
      />
      <div className={classes.buttonWrapper}>
        <StudioButton disabled={hasAvailableDataModels} type='submit' variant='primary'>
          {t('process_editor.configuration_panel_custom_receipt_create_button')}
        </StudioButton>
        <StudioButton onClick={onCloseForm} variant='secondary'>
          {t('process_editor.configuration_panel_custom_receipt_cancel_button')}
        </StudioButton>
      </div>
    </form>
  );
};
