import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioDeleteButton, StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../utils/configPanelUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';
import { useTranslation } from 'react-i18next';
import { EditDataTypes } from '../../../ConfigContent/EditDataTypes';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { Paragraph } from '@digdir/designsystemet-react';

export const CustomReceipt = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    layoutSets,
    allDataModelIds,
    existingCustomReceiptLayoutSetId,
    deleteLayoutSet,
    mutateLayoutSetId,
  } = useBpmnApiContext();

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
      <div className={classes.inputFields}>
        <StudioToggleableTextfield
          customValidation={handleValidation}
          inputProps={{
            className: classes.textfield,
            icon: <KeyVerticalIcon />,
            label: t('process_editor.configuration_panel_custom_receipt_textfield_label'),
            value: existingCustomReceiptLayoutSetId,
            onBlur: handleEditLayoutSetId,
            size: 'small',
          }}
          viewProps={{
            children: (
              <Paragraph size='small'>
                <strong>
                  {t('process_editor.configuration_panel_custom_receipt_layout_set_name')}
                </strong>
                {existingCustomReceiptLayoutSetId}
              </Paragraph>
            ),
            variant: 'tertiary',
            'aria-label': t('process_editor.configuration_panel_custom_receipt_textfield_label'),
          }}
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
