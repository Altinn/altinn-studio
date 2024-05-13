import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioButton, StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon, LinkIcon } from '@studio/icons';
import { Paragraph } from '@digdir/design-system-react';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../../utils/customReceiptUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';
import { useTranslation } from 'react-i18next';

export type CustomReceiptProps = {
  onClickEditButton: () => void;
};

export const CustomReceipt = ({ onClickEditButton }: CustomReceiptProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, deleteLayoutSet, mutateLayoutSet } =
    useBpmnApiContext();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const handleDeleteCustomReceipt = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  const handleEditLayoutSetId = (event: React.FocusEvent<HTMLInputElement, Element>) => {
    const newLayoutSetId: string = event.target.value;

    mutateLayoutSet({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    });
  };

  return (
    <div className={classes.wrapper}>
      <StudioToggleableTextfield
        // customValidation={validateTaskId}
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
      <span className={classes.customReceiptField}>
        <LinkIcon className={classes.icon} />
        <Paragraph size='small'>
          <strong>{t('process_editor.configuration_panel_custom_receipt_datamodel_id')}</strong>
          {existingDatamodelId}
        </Paragraph>
      </span>
      <div className={classes.buttonWrapper}>
        {/*<StudioButton size='small' onClick={onClickEditButton}>
          {t('process_editor.configuration_panel_custom_receipt_edit_button')}
        </StudioButton>*/}
        <StudioButton
          size='small'
          color='danger'
          onClick={handleDeleteCustomReceipt}
          variant='secondary'
        >
          {t('process_editor.configuration_panel_custom_receipt_delete_button')}
        </StudioButton>
      </div>
      <RedirectToCreatePageButton />
    </div>
  );
};
