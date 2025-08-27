import React, { useState } from 'react';
import classes from './CreateCustomReceiptForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioTextfield } from 'libs/studio-components-legacy/src';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { type CustomReceiptType } from '../../../../../types/CustomReceiptType';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { SelectCustomReceiptDataModelId } from './SelectCustomReceiptDataModelId';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

export type CreateCustomReceiptFormProps = {
  onCloseForm: () => void;
};

export const CreateCustomReceiptForm = ({
  onCloseForm,
}: CreateCustomReceiptFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const { allDataModelIds, layoutSets, existingCustomReceiptLayoutSetId, addLayoutSet } =
    useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const allDataModelIdsEmpty: boolean = allDataModelIds.length === 0;

  const [layoutSetError, setLayoutSetError] = useState<string>(null);
  const [dataModelError, setDataModelError] = useState<string>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);
    const customReceiptForm: CustomReceiptType = getCustomReceiptFormData(formData);
    const { layoutSetId, dataModelId } = customReceiptForm;

    if (layoutSetId && dataModelId && !layoutSetError) {
      createNewCustomReceipt(customReceiptForm);
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

  const createNewCustomReceipt = (customReceipt: CustomReceiptType) => {
    const customReceiptLayoutSetConfig: LayoutSetConfig = {
      id: customReceipt.layoutSetId,
      dataType: customReceipt.dataModelId,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    };
    addLayoutSet(
      {
        layoutSetIdToUpdate: customReceipt.layoutSetId,
        layoutSetConfig: customReceiptLayoutSetConfig,
      },
      {
        onSuccess: onCloseForm,
      },
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
        <StudioButton disabled={allDataModelIdsEmpty} type='submit' variant='primary'>
          {t('process_editor.configuration_panel_custom_receipt_create_button')}
        </StudioButton>
        <StudioButton onClick={onCloseForm} variant='secondary'>
          {t('process_editor.configuration_panel_custom_receipt_cancel_button')}
        </StudioButton>
      </div>
    </form>
  );
};
