import React, { useState } from 'react';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components';
import { PlusIcon } from '@studio/icons';
// import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
// import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';

type CreateSubFormWrapperProps = {
  layoutSetNames: string[];
};

export const CreateSubFormWrapper = ({ layoutSetNames }: CreateSubFormWrapperProps) => {
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [newSubFormName, setNewSubFormName] = useState('');
  const [nameError, setNameError] = useState(false);
  const { t } = useTranslation();

  //   const { org, app } = useStudioEnvironmentParams();
  //   const { mutate: addLayoutSet, isPending: addLayoutSetPending } = useAddLayoutSetMutation(
  //     org,
  //     app,
  //   );

  const validateName = (name: string) => {
    const nameExists = layoutSetNames.some(
      (existingName) => existingName.toLowerCase() === name.toLowerCase(),
    );

    nameExists ? setNameError(true) : setNameError(false);
  };

  const onCreateConfirmClick = () => {
    setCreateNewOpen(false);
    //   addLayoutSet({
    //     layoutSetIdToUpdate: 'subform',
    //     layoutSetConfig: {
    //       id: 'subform',
    //       tasks: [],
    //     },
    //   });
  };

  const onNameChange = (e: any) => {
    const name = e.target.value || '';
    validateName(name);
    setNewSubFormName(name);
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
          error={nameError && 'Navnet eksisterer allerede'}
        />
        <StudioButton
          variant='secondary'
          onClick={onCreateConfirmClick}
          disabled={!newSubFormName || nameError}
        >
          {t('ux_editor.create.sub_form.confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
