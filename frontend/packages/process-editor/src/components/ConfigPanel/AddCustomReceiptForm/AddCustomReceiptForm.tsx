import React, { useState } from 'react';
import classes from './AddCustomReceiptForm.module.css';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import { PencilWritingIcon, PlusCircleIcon } from '@studio/icons';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export type AddCustomReceiptFormProps = {
  existingCustomReceiptLayoutSetId: string | undefined;
  onSaveCustomReceipt: (newCustomReceiptLayoutSetId: string) => void;
  handleDeleteCustomReceipt: () => void;
};

export const AddCustomReceiptForm = ({
  existingCustomReceiptLayoutSetId,
  onSaveCustomReceipt,
  handleDeleteCustomReceipt,
}: AddCustomReceiptFormProps): React.JSX.Element => {
  const { org, app } = useStudioUrlParams();
  const packagesRouter = new PackagesRouter({ org, app });

  const [showCreateCustomReceiptFields, setShowCreateCustomReceiptFields] = useState(false);

  const handleSaveCustomReceipt = () => {
    // Send verdi fra tekstfelt
    onSaveCustomReceipt('');
    setShowCreateCustomReceiptFields(false);
  };

  const handleClickCreateCustomReceipt = () => {
    setShowCreateCustomReceiptFields(true);
  };

  const handleCancelCreateCustomReceipt = () => {
    setShowCreateCustomReceiptFields(false);
  };

  // Case 1 - Initial
  if (!existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return (
      <StudioButton
        size='small'
        onClick={handleClickCreateCustomReceipt}
        icon={<PlusCircleIcon />}
        variant='tertiary'
      >
        Opprett din egen kvittering
      </StudioButton>
    );
  }

  // Case 2 - In "create mode"
  if (!existingCustomReceiptLayoutSetId && showCreateCustomReceiptFields) {
    return (
      /*  CAN THIS BLOCK GO TOGETHER WITH BLOCK ON 3 AND 4 ?? */
      <div>
        <p>TEXT FIELD</p>
        <p>Drop down</p>
        {/****************************/}
        <div className={classes.buttonWrapper}>
          <StudioButton size='small' onClick={handleSaveCustomReceipt} variant='primary'>
            Opprett
          </StudioButton>
          <StudioButton size='small' onClick={handleCancelCreateCustomReceipt} variant='secondary'>
            Avbryt
          </StudioButton>
        </div>
      </div>
    );
  }

  // Case 3 - In final mode - can delete or edit - Delete sends to case 1, edit to case 4
  if (existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return (
      <div>
        {/* TODO - When clicking the entire block, set to case 4 */}
        {/*  CAN THIS BLOCK GO TOGETHER WITH BLOCK ON 2 AND 3 ?? */}
        <div>
          <p>TEXT FIELD with value</p>
          <p>drop downwith value</p>
        </div>
        {/*********************************************************/}
        <StudioButton
          size='small'
          color='danger'
          onClick={handleDeleteCustomReceipt}
          variant='secondary'
        >
          Slett kvitteringen din
        </StudioButton>
        {/* THE BLOCK BELOW SHOULD BE A REUSABLE COMPONENT */}
        <div className={classes.goToCreatePageWrapper}>
          <StudioLabelAsParagraph size='small'>
            Gå til Lage for å utforme kvitteringen din
          </StudioLabelAsParagraph>
          <StudioButton
            as='a'
            size='small'
            variant='primary'
            color='second'
            icon={<PencilWritingIcon />}
            href={packagesRouter.getPackageNavigationUrl('editorUiEditor')}
            className={classes.goToCreateButton}
          >
            Gå til Lage
          </StudioButton>
        </div>
      </div>
    );
  }

  // Case 4 - In "edit mode"
  if (existingCustomReceiptLayoutSetId && showCreateCustomReceiptFields) {
    return (
      /*  CAN THIS BLOCK GO TOGETHER WITH BLOCK ON 2 AND 3 ?? */
      <div>
        <p>TEXT FIELD</p>
        <p>Drop down</p>
        {/****************************/}
        <div className={classes.buttonWrapper}>
          <StudioButton size='small' onClick={handleSaveCustomReceipt} variant='primary'>
            Lagre
          </StudioButton>
          <StudioButton size='small' onClick={handleCancelCreateCustomReceipt} variant='secondary'>
            Avbryt
          </StudioButton>
        </div>
      </div>
    );
  }
};

/*

4 states:
- Når man ikke har noe, og det står en "opprett din egen kvittering" knapp
- Når man er i "lage" mode, og ser opprett knapp
- Når man er i "endre" mode, og ser lagre knapp
- Når man er utenfor state 2 og 3, og man har en visningsmodus og en "slett" knapp

*/
