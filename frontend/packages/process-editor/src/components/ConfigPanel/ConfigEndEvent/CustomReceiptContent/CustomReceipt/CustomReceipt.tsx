import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioButton } from '@studio/components';
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
  const { layoutSets, existingCustomReceiptLayoutSetId, deleteLayoutSet } = useBpmnApiContext();

  const existingDatamodelId: string = getExistingDatamodelIdFromLayoutsets(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const handleDeleteCustomReceipt = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  return (
    <div className={classes.wrapper}>
      <span className={classes.customReceiptField}>
        <KeyVerticalIcon className={classes.icon} />
        <Paragraph size='small'>
          <strong>{t('process_editor.configuration_panel_custom_receipt_layoutset_name')}</strong>
          {existingCustomReceiptLayoutSetId}
        </Paragraph>
      </span>
      <span className={classes.customReceiptField}>
        <LinkIcon className={classes.icon} />
        <Paragraph size='small'>
          <strong>{t('process_editor.configuration_panel_custom_receipt_datamodel_id')}</strong>
          {existingDatamodelId}
        </Paragraph>
      </span>
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' onClick={onClickEditButton}>
          {t('process_editor.configuration_panel_custom_receipt_edit_button')}
        </StudioButton>
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
