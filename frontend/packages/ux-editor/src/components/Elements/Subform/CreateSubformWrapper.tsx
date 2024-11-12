import React, { useState } from 'react';
import { StudioButton, StudioPopover, StudioSpinner, StudioTextfield } from '@studio/components';
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
  const { createSubform, isPendingLayoutSetMutation } = useCreateSubform();

  const onCreateConfirmClick = () => {
    setCreateNewOpen(false);
    onSubformCreated(newSubformName);
  };

  const handleNameChange = (subformName: string) => {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNameError(subformNameValidation);
    setNewSubformName(subformName);
  };
  const handleCreateSubform = () => {
    createSubform({
      layoutSetName: newSubformName,
      onSubformCreated: onCreateConfirmClick,
      //setting datatype to empty string as this createSubform area is only temporary and will be removed in a later PR
      dataType: '',
    });
  };

  const createSubformButtonContent = isPendingLayoutSetMutation ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    t('ux_editor.create.subform.confirm_button')
  );

  return (
    <StudioPopover
      open={createNewOpen}
      onOpenChange={!isPendingLayoutSetMutation && setCreateNewOpen}
    >
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
          onChange={(e) => handleNameChange(e.target.value)}
          error={nameError}
          disabled={isPendingLayoutSetMutation}
        />
        <StudioButton
          className={classes.confirmCreateButton}
          variant='secondary'
          onClick={handleCreateSubform}
          disabled={!newSubformName || !!nameError}
        >
          {createSubformButtonContent}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
