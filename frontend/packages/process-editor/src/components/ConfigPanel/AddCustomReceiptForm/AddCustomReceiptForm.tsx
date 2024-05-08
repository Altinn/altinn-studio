import React, { useState } from 'react';
import classes from './AddCustomReceiptForm.module.css';
import {
  StudioButton,
  StudioLabelAsParagraph,
  StudioNativeSelect,
  StudioTextfield,
} from '@studio/components';
import { KeyVerticalIcon, LinkIcon, PencilWritingIcon, PlusCircleIcon } from '@studio/icons';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Paragraph } from '@digdir/design-system-react';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { type CustomReceipt } from '../../../types/CustomReceipt';
import { useTranslation } from 'react-i18next';

export type AddCustomReceiptFormProps = {
  onSaveCustomReceipt: (customReceipt: CustomReceipt) => void;
  handleDeleteCustomReceipt: () => void;
};

export const AddCustomReceiptForm = ({
  onSaveCustomReceipt,
  handleDeleteCustomReceipt,
}: AddCustomReceiptFormProps): React.JSX.Element => {
  const { layoutSets, existingCustomReceiptLayoutSetId, availableDataModelIds } =
    useBpmnApiContext();

  const existingDatamodelId = layoutSets.sets.find(
    (layoutSet) => layoutSet.id === existingCustomReceiptLayoutSetId,
  )?.dataType;

  console.log('existingDatamodelId', existingDatamodelId);

  const [showCreateCustomReceiptFields, setShowCreateCustomReceiptFields] = useState(false);

  const handleSaveCustomReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData: FormData = new FormData(event.currentTarget);

    const customReceiptForm: CustomReceipt = {
      layoutSetId: formData.get('customReceiptLayoutSetId') as string,
      datamodelId: formData.get('customReceiptDatamodel') as string,
    };

    console.log('customReceiptForm', customReceiptForm);

    onSaveCustomReceipt(customReceiptForm);
    setShowCreateCustomReceiptFields(false);
  };

  const handleClickCreateCustomReceipt = () => {
    setShowCreateCustomReceiptFields(true);
  };

  const handleCancelCreateCustomReceipt = () => {
    setShowCreateCustomReceiptFields(false);
  };

  const handleClickEditButton = () => {
    setShowCreateCustomReceiptFields(true);
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

  // Case 2 - In "create mode" & Case 4 - In "edit mode"
  if (showCreateCustomReceiptFields) {
    return (
      <Comp
        onSubmit={handleSaveCustomReceipt}
        existingCustomReceiptLayoutSetId={existingCustomReceiptLayoutSetId}
        existingDataType={existingDatamodelId}
        onCancel={handleCancelCreateCustomReceipt}
        availableDatamodelIds={[...availableDataModelIds, existingDatamodelId]}
      />
    );
  }

  // Case 3 - In final mode - can delete or edit - Delete sends to case 1, edit to case 4
  if (existingCustomReceiptLayoutSetId && !showCreateCustomReceiptFields) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--fds-spacing-4)',
          marginTop: 'var(--fds-spacing-3)',
        }}
      >
        {/* TODO - MAKE OWN COMPONENT */}
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <KeyVerticalIcon style={{ fontSize: 'var(--fds-sizing-6)' }} />
          <Paragraph size='small'>
            <strong>Navn på sidegruppe: </strong>
            {existingCustomReceiptLayoutSetId}
          </Paragraph>
        </span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <LinkIcon style={{ fontSize: 'var(--fds-sizing-6)' }} />
          <Paragraph size='small'>
            <strong>Datamodellknytning: </strong>
            {existingDatamodelId}
          </Paragraph>
        </span>
        {/*********************************************************/}
        <div
          style={{
            display: 'flex',
            gap: 'var(--fds-spacing-2)',
          }}
        >
          <StudioButton size='small' onClick={handleClickEditButton}>
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
  }
};

/*

4 states:
- Når man ikke har noe, og det står en "opprett din egen kvittering" knapp
- Når man er i "lage" mode, og ser opprett knapp
- Når man er i "endre" mode, og ser lagre knapp
- Når man er utenfor state 2 og 3, og man har en visningsmodus og en "slett" knapp

*/

// TODO MOVE
type Props = {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  existingCustomReceiptLayoutSetId: string | undefined;
  existingDataType: string;
  onCancel: () => void;
  availableDatamodelIds: string[]; // { value: string; label: string }[];
};
const Comp = ({
  onSubmit,
  existingCustomReceiptLayoutSetId,
  existingDataType,
  onCancel,
  availableDatamodelIds,
}: Props) => {
  const { t } = useTranslation();

  const availableDatamodelIdsEmpty: boolean = availableDatamodelIds.length === 0;

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--fds-spacing-5)',
        marginTop: 'var(--fds-spacing-3)',
      }}
    >
      <StudioTextfield
        name='customReceiptLayoutSetId'
        // defaultValue={}
        label='Navn på sidegruppe'
        value={existingCustomReceiptLayoutSetId}
        size='small'
        // error - TODO
        // onChange - TODO
      />
      {/* TODO - Add label and description to NativeSelect when this issue is solved in the design system: https://github.com/Altinn/altinn-studio/issues/12725 */}
      <StudioNativeSelect
        label='Datamodelknytning'
        size='small'
        description={
          availableDatamodelIdsEmpty &&
          'Du må ha noen ledige datamodeller du kan knytte mot kvitteringen for at det skal visesnoen i listen under.'
        }
        name='customReceiptDatamodel'
        id='customReceiptDataModelSelect'
        disabled={availableDatamodelIdsEmpty}
        defaultValue={existingDataType ?? 'noModelKey'}
      >
        <option disabled={true} value={'noModelKey'}>
          {t('process_editor.configuration_panel_select_datamodel')}
        </option>
        {availableDatamodelIds.map((id: string) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </StudioNativeSelect>
      <div className={classes.buttonWrapper}>
        <StudioButton size='small' type='submit' variant='primary'>
          {!existingCustomReceiptLayoutSetId ? 'Opprett' : 'Lagre'}
        </StudioButton>
        <StudioButton size='small' onClick={onCancel} variant='secondary'>
          Avbryt
        </StudioButton>
      </div>
    </form>
  );
};

const RedirectToCreatePageButton = () => {
  const { org, app } = useStudioUrlParams();
  const packagesRouter = new PackagesRouter({ org, app });

  return (
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
  );
};
