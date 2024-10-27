import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioTextfield } from '@studio/components';
import { ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './CreateNewLayoutSet.module.css';

type CreateNewLayoutSetProps = {
  onSubFormCreated: (layoutSetName: string) => void;
};

export const CreateNewLayoutSet = ({
  onSubFormCreated,
}: CreateNewLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [newSubForm, setNewSubForm] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);

  const createNewSubform = () => {
    if (!newSubForm) return;
    addLayoutSet({
      layoutSetIdToUpdate: newSubForm,
      layoutSetConfig: {
        id: newSubForm,
        type: 'subform',
      },
    });
    onSubFormCreated(newSubForm);
    setNewSubForm('');
  };

  function onNameChange(subFormName: string) {
    setNewSubForm(subFormName);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onNameChange(e.target.value);
  }

  return (
    <StudioCard>
      <StudioCard.Content>
        <StudioCard.Header>
          <ClipboardIcon className={classes.headerIcon} />
        </StudioCard.Header>
        <StudioTextfield
          label={t('ux_editor.component_properties.subform.created_layout_set_name')}
          value={newSubForm}
          size='sm'
          onChange={handleChange}
        />
        <StudioButton
          className={classes.savelayoutSetButton}
          icon={<CheckmarkIcon />}
          onClick={createNewSubform}
          title={t('general.close')}
          variant='tertiary'
          color='success'
        />
      </StudioCard.Content>
    </StudioCard>
  );
};
