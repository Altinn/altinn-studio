import React, { useState } from 'react';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

type CreateSubFormWrapperProps = {
  layoutSets: LayoutSets | undefined;
};

export const CreateSubFormWrapper = ({ layoutSets }: CreateSubFormWrapperProps) => {
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [newSubFormName, setNewSubFormName] = useState('');
  const [nameError, setNameError] = useState('');
  const { t } = useTranslation();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet, isPending: addLayoutSetPending } = useAddLayoutSetMutation(
    org,
    app,
  );

  const onCreateConfirmClick = () => {
    setCreateNewOpen(false);

    addLayoutSet({
      layoutSetIdToUpdate: newSubFormName,
      layoutSetConfig: {
        id: newSubFormName,
        type: 'subform',
      },
    });
  };

  const onNameChange = (e: any) => {
    const subFormName = e.target.value || '';
    const subFormNameValidation = validateLayoutSetName(subFormName, layoutSets);
    setNameError(subFormNameValidation);
    setNewSubFormName(subFormName);
  };

  return (
    <StudioPopover open={createNewOpen} onOpenChange={setCreateNewOpen}>
      <StudioPopover.Trigger asChild>
        <StudioButton
          icon={<PlusIcon />}
          variant='tertiary'
          onClick={() => setCreateNewOpen(!createNewOpen)}
        >
          {t('ux_editor.create.sub_form')}
        </StudioButton>
      </StudioPopover.Trigger>
      <StudioPopover.Content>
        <StudioTextfield
          label={t('ux_editor.create.sub_form.label')}
          size='small'
          value={newSubFormName}
          onChange={onNameChange}
          error={nameError}
        />
        <StudioButton
          variant='secondary'
          onClick={onCreateConfirmClick}
          disabled={!newSubFormName || !!nameError}
        >
          {t('ux_editor.create.sub_form.confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
