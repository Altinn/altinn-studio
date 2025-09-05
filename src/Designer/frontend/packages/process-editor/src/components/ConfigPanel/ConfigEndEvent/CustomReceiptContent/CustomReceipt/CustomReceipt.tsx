import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioToggleableTextfield } from '@studio/components-legacy';
import { StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../utils/configPanelUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';
import { useTranslation } from 'react-i18next';
import { EditDataTypes } from '../../../ConfigContent/EditDataTypes';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

export const CustomReceipt = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    layoutSets,
    allDataModelIds,
    existingCustomReceiptLayoutSetId,
    deleteLayoutSet,
    mutateLayoutSetId,
  } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const existingDataModelId: string = getDataTypeFromLayoutSetsWithExistingId(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const handleDeleteCustomReceipt = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  const handleEditLayoutSetId = (event: React.FocusEvent<HTMLInputElement, Element>) => {
    const newLayoutSetId: string = event.target.value;

    if (newLayoutSetId === existingCustomReceiptLayoutSetId) return;

    mutateLayoutSetId({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    });
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.inputFields}>
        <StudioToggleableTextfield
          customValidation={(newLayoutSetName: string) =>
            validateLayoutSetName(newLayoutSetName, layoutSets, existingCustomReceiptLayoutSetId)
          }
          label={t('process_editor.configuration_panel_custom_receipt_textfield_label')}
          onBlur={handleEditLayoutSetId}
          value={existingCustomReceiptLayoutSetId}
        />
        <EditDataTypes
          connectedTaskId={PROTECTED_TASK_NAME_CUSTOM_RECEIPT}
          dataModelIds={allDataModelIds}
          existingDataTypeForTask={existingDataModelId}
          hideDeleteButton
        />
      </div>
      <div className={classes.buttonWrapper}>
        <StudioDeleteButton
          data-size='xs'
          onDelete={handleDeleteCustomReceipt}
          confirmMessage={t('process_editor.configuration_panel_custom_receipt_delete_receipt')}
        >
          {t('process_editor.configuration_panel_custom_receipt_delete_button')}
        </StudioDeleteButton>
      </div>
      <RedirectToCreatePageButton />
    </div>
  );
};
