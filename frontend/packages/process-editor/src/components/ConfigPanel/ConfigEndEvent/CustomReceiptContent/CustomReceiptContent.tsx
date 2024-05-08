import React, { useState } from 'react';
import { StudioButton } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { CustomReceipt } from './CustomReceipt';
import { CustomReceiptForm } from './CustomReceiptForm';
import { useTranslation } from 'react-i18next';

export const CustomReceiptContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { existingCustomReceiptLayoutSetId } = useBpmnApiContext();

  const [showCreateCustomReceiptFields, setShowCreateCustomReceiptFields] = useState(false);

  const openCustomReceiptFields = () => setShowCreateCustomReceiptFields(true);
  const closeCustomReceiptFields = () => setShowCreateCustomReceiptFields(false);

  if (!existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return (
      <StudioButton
        size='small'
        onClick={openCustomReceiptFields}
        icon={<PlusCircleIcon />}
        variant='tertiary'
      >
        {t('process_editor.configuration_panel_custom_receipt_create_your_own_button')}
      </StudioButton>
    );
  }
  if (showCreateCustomReceiptFields) {
    return <CustomReceiptForm onCloseForm={closeCustomReceiptFields} />;
  }
  return <CustomReceipt onClickEditButton={openCustomReceiptFields} />;
};
