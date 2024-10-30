import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioTextfield } from '@studio/components';
import { ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './CreateNewSubformLayoutSet.module.css';
import type { MetadataOption } from 'app-development/types/MetadataOption';
import { useDataModelsJsonQuery } from 'app-shared/hooks/queries';
import { SubformDataModelSelect } from './SubformDataModelSelect';

type CreateNewSubformLayoutSetProps = {
  onSubFormCreated: (layoutSetName: string) => void;
};

export const CreateNewSubformLayoutSet = ({
  onSubFormCreated,
}: CreateNewSubformLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [newSubForm, setNewSubForm] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);
  const [selectedOption, setSelectedOption] = useState<MetadataOption | null>(null);
  const jsonQuery = useDataModelsJsonQuery(org, app);

  const createNewSubform = () => {
    if (!newSubForm || !selectedOption) return;
    addLayoutSet({
      layoutSetIdToUpdate: newSubForm,
      layoutSetConfig: {
        id: newSubForm,
        type: 'subform',
        dataType: selectedOption.label,
      },
    });
    onSubFormCreated(newSubForm);
    setNewSubForm('');
    setSelectedOption(null);
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewSubForm(e.target.value);
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
        <SubformDataModelSelect
          dataModels={jsonQuery.data || []}
          disabled={false}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
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
