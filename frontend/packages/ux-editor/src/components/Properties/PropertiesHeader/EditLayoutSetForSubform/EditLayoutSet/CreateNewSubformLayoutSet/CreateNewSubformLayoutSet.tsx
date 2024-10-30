import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioTextfield } from '@studio/components';
import { ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './CreateNewSubformLayoutSet.module.css';

type CreateNewSubformLayoutSetProps = {
  onSubformCreated: (layoutSetName: string) => void;
};

export const CreateNewSubformLayoutSet = ({
  onSubformCreated,
}: CreateNewSubformLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [newSubform, setNewSubform] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);

  const createNewSubform = () => {
    if (!newSubform) return;
    addLayoutSet({
      layoutSetIdToUpdate: newSubform,
      layoutSetConfig: {
        id: newSubform,
        type: 'subform',
      },
    });
    onSubformCreated(newSubform);
    setNewSubform('');
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewSubform(e.target.value);
  }

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
