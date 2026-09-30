import React, { useState } from 'react';
import classes from './CreateCustomReceipt.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { SelectCustomReceiptDataModelId } from './SelectCustomReceiptDataModelId';
import { createNewCustomReceipt } from '../CustomReceiptUtils';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export type CreateCustomReceiptFormProps = {
  onCloseForm: () => void;
};

export const CreateCustomReceipt = ({
  onCloseForm,
}: CreateCustomReceiptFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const { allDataModelIds, addLayoutSet } = useBpmnApiContext();
  const [dataModelError, setDataModelError] = useState<string>(null);
  const [dataModelId, setDataModelId] = useState<string>(null);
  const hasAvailableDataModels: boolean = allDataModelIds.length > 0;

  const addCustomReceipt = (customReceipt: LayoutSetConfig) => {
    addLayoutSet(
      {
        layoutSetConfig: customReceipt,
      },
      {
        onSuccess: onCloseForm,
      },
    );
  };

  const handleSave = () => {
    if (dataModelId) {
      const customReceipt = createNewCustomReceipt({ dataModelId });
      setDataModelError(null);
      addCustomReceipt(customReceipt);
    } else {
      setDataModelError(
        t('process_editor.configuration_panel_custom_receipt_create_data_model_error'),
      );
    }
  };

  const handleDataModelChange = (newDataModelId: string) => {
    setDataModelId(newDataModelId);
    setDataModelError(null);
  };

  return (
    <div className={classes.customReceiptWrapper}>
      <SelectCustomReceiptDataModelId error={dataModelError} onChange={handleDataModelChange} />
      <div className={classes.buttonWrapper}>
        <StudioButton disabled={!hasAvailableDataModels} onClick={handleSave} variant='primary'>
          {t('process_editor.configuration_panel_custom_receipt_create_button')}
        </StudioButton>
        <StudioButton onClick={onCloseForm} variant='secondary'>
          {t('process_editor.configuration_panel_custom_receipt_cancel_button')}
        </StudioButton>
      </div>
    </div>
  );
};
