import React from 'react';
import classes from './CustomReceipt.module.css';
import { StudioButton } from '@studio/components';
import { KeyVerticalIcon, LinkIcon } from '@studio/icons';
import { Paragraph } from '@digdir/design-system-react';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { getExistingDatamodelIdFromLayoutsets } from '../../../../utils/customReceiptUtils';
import { RedirectToCreatePageButton } from '../RedirectToCreatePageButton';

export type CustomReceiptProps = {
  onClickEditButton: () => void;
};

export const CustomReceipt = ({ onClickEditButton }: CustomReceiptProps): React.ReactElement => {
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
          <strong>Navn på sidegruppe: </strong>
          {existingCustomReceiptLayoutSetId}
        </Paragraph>
      </span>
      <span className={classes.customReceiptField}>
        <LinkIcon className={classes.icon} />
        <Paragraph size='small'>
          <strong>Datamodellknytning: </strong>
          {existingDatamodelId}
        </Paragraph>
      </span>
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' onClick={onClickEditButton}>
          Endre kvittering
        </StudioButton>
        <StudioButton
          size='small'
          color='danger'
          onClick={handleDeleteCustomReceipt}
          variant='secondary'
        >
          Slett kvittering
        </StudioButton>
      </div>
      <RedirectToCreatePageButton />
    </div>
  );
};
