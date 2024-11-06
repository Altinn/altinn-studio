import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioSpinner, StudioTextfield } from '@studio/components';
import { ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import classes from './CreateNewSubformLayoutSet.module.css';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

type CreateNewSubformLayoutSetProps = {
  onSubformCreated: (layoutSetName: string) => void;
  layoutSets: LayoutSets;
};

export const CreateNewSubformLayoutSet = ({
  onSubformCreated,
  layoutSets,
}: CreateNewSubformLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [newSubform, setNewSubform] = useState('');
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { createSubform, isPendingLayoutSetMutation } = useCreateSubform();
  const [nameError, setNameError] = useState('');

  function handleChange(subformName: string) {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNameError(subformNameValidation);
    setNewSubform(subformName);
  }

  const saveIcon = isPendingLayoutSetMutation ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    <CheckmarkIcon />
  );

  return (
    <StudioCard>
      <StudioCard.Content>
        <StudioCard.Header>
          <ClipboardIcon className={classes.headerIcon} />
        </StudioCard.Header>
        <StudioTextfield
          label={t('ux_editor.component_properties.subform.created_layout_set_name')}
          value={newSubform}
          size='sm'
          disabled={isPendingLayoutSetMutation}
          onChange={(e) => handleChange(e.target.value)}
          error={nameError}
        />
        <StudioButton
          className={classes.savelayoutSetButton}
          icon={saveIcon}
          onClick={() => createSubform({ layoutSetName: newSubform, onSubformCreated })}
          title={t('general.close')}
          disabled={!newSubform || !!nameError}
          variant='tertiary'
          color='success'
        />
      </StudioCard.Content>
    </StudioCard>
  );
};
