import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioDeleteButton, StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { Paragraph } from '@digdir/design-system-react';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../../utils/customReceiptUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';
import { useTranslation } from 'react-i18next';
import { EditDataType } from '../../../EditDataType';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';

export const CustomReceipt = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    layoutSets,
    availableDataModelIds,
    existingCustomReceiptLayoutSetId,
    deleteLayoutSet,
    mutateLayoutSet,
  } = useBpmnApiContext();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const handleDeleteCustomReceipt = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  const handleEditLayoutSetId = (event: React.FocusEvent<HTMLInputElement, Element>) => {
    const newLayoutSetId: string = event.target.value;

    if (newLayoutSetId === existingCustomReceiptLayoutSetId) return;

    mutateLayoutSet({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    });
  };

  const options = existingDatamodelId
    ? [...availableDataModelIds, existingDatamodelId]
    : availableDataModelIds;

  const handleValidation = (newLayoutSetId: string): string => {
    const validationResult = getLayoutSetIdValidationErrorKey(
      layoutSets,
      existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    );
    return validationResult ? t(validationResult) : undefined;
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.inputfields}>
        <StudioToggleableTextfield
          customValidation={handleValidation}
          inputProps={{
            icon: <KeyVerticalIcon />,
            label: t('process_editor.configuration_panel_custom_receipt_textfield_label'),
            value: existingCustomReceiptLayoutSetId,
            onBlur: handleEditLayoutSetId,
            size: 'small',
          }}
          viewProps={{
            children: (
              <Paragraph size='small' className={classes.toggleableButtonText}>
                <strong>
                  {t('process_editor.configuration_panel_custom_receipt_layoutset_name')}
                </strong>
                {existingCustomReceiptLayoutSetId}
              </Paragraph>
            ),
            value: existingCustomReceiptLayoutSetId,
            variant: 'tertiary',
            'aria-label': t('process_editor.configuration_panel_custom_receipt_textfield_label'),
          }}
        />
        <EditDataType
          connectedTaskId={PROTECTED_TASK_NAME_CUSTOM_RECEIPT}
          datamodelIds={options}
          existingDataTypeForTask={existingDatamodelId}
          hideSelectDeleteButton
        />
      </div>
      <div className={classes.buttonWrapper}>
        <StudioDeleteButton
          size='small'
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
