import React, { useState } from 'react';
import classes from './CreateCustomReceipt.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import {
  isVersionEqualOrGreater,
  MINIMUM_APPLIB_VERSION_FOR_FIXED_CUSTOM_RECEIPT_NAME,
} from '../../../../../utils/processEditorUtils/processEditorUtils';
import { SelectCustomReceiptDataModelId } from './SelectCustomReceiptDataModelId';
import { CreateCustomReceiptFormLegacy } from './CreateCustomReceiptFormLegacy';
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
  const { appVersion } = useBpmnContext();

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

  // From v9 the custom receipt's layout set is named after its task, so the name is fixed and hidden.
  const hasFixedName: boolean = isVersionEqualOrGreater(
    appVersion?.backendVersion ?? '',
    MINIMUM_APPLIB_VERSION_FOR_FIXED_CUSTOM_RECEIPT_NAME,
  );

  if (!hasFixedName) {
    return (
      <CreateCustomReceiptFormLegacy
        addCustomReceipt={addCustomReceipt}
        onCloseForm={onCloseForm}
        hasAvailableDataModels={hasAvailableDataModels}
      />
    );
  }

  const handleSave = () => {
    if (dataModelId) {
      const customReceipt = createNewCustomReceipt({ dataModelId }, hasFixedName);
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
