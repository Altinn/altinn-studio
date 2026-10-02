import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioDeleteButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { hasFixedCustomReceiptName } from '../CustomReceiptUtils';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../utils/configPanelUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';
import { useTranslation } from 'react-i18next';
import { EditDataTypes } from '../../../ConfigContent/EditDataTypes';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { CustomReceiptLegacy } from './CustomReceiptLegacy';

export const CustomReceipt = (): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, allDataModelIds, existingCustomReceiptLayoutSetId, deleteLayoutSet } =
    useBpmnApiContext();
  const { appVersion } = useBpmnContext();

  if (!hasFixedCustomReceiptName(appVersion)) {
    return <CustomReceiptLegacy />;
  }

  const existingDataModelId: string = getDataTypeFromLayoutSetsWithExistingId(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const handleDeleteCustomReceipt = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  return (
    <div className={classes.wrapper}>
      <EditDataTypes
        connectedTaskId={PROTECTED_TASK_NAME_CUSTOM_RECEIPT}
        dataModelIds={allDataModelIds}
        existingDataTypeForTask={existingDataModelId}
        hideDeleteButton
      />
      <StudioDeleteButton
        onDelete={handleDeleteCustomReceipt}
        confirmMessage={t('process_editor.configuration_panel_custom_receipt_delete_receipt')}
        className={classes.deleteButton}
      >
        {t('process_editor.configuration_panel_custom_receipt_delete_button')}
      </StudioDeleteButton>
      <RedirectToCreatePageButton />
    </div>
  );
};
