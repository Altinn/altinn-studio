import React, { useState } from 'react';
import { StudioButton } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { CustomReceipt } from './CustomReceipt';
import { getExistingDatamodelIdFromLayoutsets } from '../../../utils/customReceiptUtils';
import { CustomReceiptForm } from './CustomReceiptForm';

// TODO - NEW NAME
export const AddCustomReceiptForm = (): React.ReactElement => {
  const { layoutSets, existingCustomReceiptLayoutSetId, availableDataModelIds } =
    useBpmnApiContext();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

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
        Opprett din egen kvittering
      </StudioButton>
    );
  }
  if (showCreateCustomReceiptFields) {
    return (
      <CustomReceiptForm
        existingDataType={existingDatamodelId}
        onCloseForm={closeCustomReceiptFields}
        availableDatamodelIds={[...availableDataModelIds, existingDatamodelId]}
      />
    );
  }
  if (existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return <CustomReceipt onClickEditButton={openCustomReceiptFields} />;
  }
};
