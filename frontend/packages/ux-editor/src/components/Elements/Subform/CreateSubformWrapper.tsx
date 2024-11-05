import React, { useState } from 'react';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import classes from './CreateSubformWrapper.module.css';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';

type CreateSubformWrapperProps = {
  layoutSets: LayoutSets;
  onSubformCreated: (layoutSetName: string) => void;
};

export const CreateSubformWrapper = ({
  layoutSets,
  onSubformCreated,
}: CreateSubformWrapperProps) => {
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [newSubformName, setNewSubformName] = useState('');
  const [nameError, setNameError] = useState('');
  const { t } = useTranslation();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { createSubform } = useCreateSubform();

  const onCreateConfirmClick = () => {
    setCreateNewOpen(false);
    createSubform({ layoutSetName: newSubformName, onSubformCreated });
  };

  const onNameChange = (subformName: string) => {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNameError(subformNameValidation);
    setNewSubformName(subformName);
  };

  return (
    <StudioPopover open={createNewOpen} onOpenChange={setCreateNewOpen}>
      <StudioPopover.Trigger asChild>
        <StudioButton
          icon={<PlusIcon />}
          variant='tertiary'
          onClick={() => setCreateNewOpen(!createNewOpen)}
        >
          {t('ux_editor.create.subform')}
        </StudioButton>
      </StudioPopover.Trigger>
      <StudioPopover.Content>
        <StudioTextfield
          label={t('ux_editor.create.subform.label')}
          size='small'
          value={newSubformName}
          onChange={(e) => onNameChange(e.target.value)}
          error={nameError}
        />
        <StudioButton
          className={classes.confirmCreateButton}
          variant='secondary'
          onClick={onCreateConfirmClick}
          disabled={!newSubformName || !!nameError}
        >
          {t('ux_editor.create.subform.confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
