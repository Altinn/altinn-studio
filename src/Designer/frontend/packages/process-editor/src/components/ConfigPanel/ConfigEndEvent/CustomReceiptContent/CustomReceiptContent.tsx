import React, { useState } from 'react';
import classes from './CustomReceiptContent.module.css';
import { StudioSpinner } from 'libs/studio-components-legacy/src';
import { StudioProperty } from 'libs/studio-components/src';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { CustomReceipt } from './CustomReceipt';
import { CreateCustomReceiptForm } from './CreateCustomReceiptForm';
import { useTranslation } from 'react-i18next';

export const CustomReceiptContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { existingCustomReceiptLayoutSetId, pendingApiOperations } = useBpmnApiContext();

  const [showCreateCustomReceiptFields, setShowCreateCustomReceiptFields] = useState(false);

  const openCustomReceiptFields = () => setShowCreateCustomReceiptFields(true);
  const closeCustomReceiptFields = () => setShowCreateCustomReceiptFields(false);

  if (pendingApiOperations) {
    return (
      <StudioSpinner
        spinnerTitle={t('process_editor.configuration_panel_custom_receipt_spinner_title')}
        className={classes.spinner}
      />
    );
  }
  if (!existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return (
      <StudioProperty.Button
        onClick={openCustomReceiptFields}
        property={t('process_editor.configuration_panel_custom_receipt_create_your_own_button')}
        className={classes.createButton}
      />
    );
  }
  if (showCreateCustomReceiptFields) {
    return <CreateCustomReceiptForm onCloseForm={closeCustomReceiptFields} />;
  }
  return <CustomReceipt />;
};
