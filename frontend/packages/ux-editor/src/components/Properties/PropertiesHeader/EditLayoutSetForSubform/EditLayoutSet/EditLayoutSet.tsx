import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import {
  StudioProperty,
  StudioRecommendedNextAction,
  StudioButton,
  StudioCard,
  StudioTextfield,
} from '@studio/components';
import { Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon, ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './EditLayoutSet.module.css';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
  onSubFormCreated: (layoutSetName: string) => void;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
  onSubFormCreated,
}: EditLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible] = useState<boolean>(false);
  const [showCreateSubform, setShowCreateSubform] = useState<boolean>(false);
  const [newSubForm, setNewSubForm] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);

  const createNewSubform = () => {
    addLayoutSet({
      layoutSetIdToUpdate: newSubForm,
      layoutSetConfig: {
        id: newSubForm,
        type: 'subform',
      },
    });
    onSubFormCreated(newSubForm);
    setShowCreateSubform(false);
  };

  function onNameChange(subFormName: string) {
    setNewSubForm(subFormName);
  }

  if (isLayoutSetSelectorVisible) {
    return (
      <SelectLayoutSet
        existingLayoutSetForSubForm={existingLayoutSetForSubform}
        onUpdateLayoutSet={onUpdateLayoutSet}
        onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
        showButtons={true}
      />
    );
  }
  const layoutSetIsUndefined = !existingLayoutSetForSubform;
  if (layoutSetIsUndefined) {
    return (
      <>
        <StudioRecommendedNextAction
          title={t('ux_editor.component_properties.subform.choose_layout_set_header')}
          description={t('ux_editor.component_properties.subform.choose_layout_set_description')}
          hideSaveButton={true}
          hideSkipButton={true}
        >
          <Paragraph size='sm'>
            {t('ux_editor.component_properties.subform.create_layout_set_description')}
          </Paragraph>
          <SelectLayoutSet
            existingLayoutSetForSubForm={existingLayoutSetForSubform}
            onUpdateLayoutSet={onUpdateLayoutSet}
            onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
            showButtons={false}
          />
          <StudioProperty.Button
            className={classes.button}
            property={t('ux_editor.component_properties.subform.create_layout_set_button')}
            icon={<PlusIcon />}
            onClick={() => setShowCreateSubform(!showCreateSubform)}
          />
        </StudioRecommendedNextAction>
        {showCreateSubform && (
          <StudioCard>
            <StudioCard.Content>
              <StudioCard.Header>
                <ClipboardIcon />
              </StudioCard.Header>
              <StudioTextfield
                label={t('ux_editor.component_properties.subform.created_layout_set_name')}
                value={newSubForm}
                size='sm'
                onChange={(e) => onNameChange(e.target.value)}
              />
              <StudioButton
                className={classes.savelayoutSetButton}
                icon={<CheckmarkIcon />}
                onClick={createNewSubform}
                title={'Lagre'}
                variant='tertiary'
                color='success'
              />
            </StudioCard.Content>
          </StudioCard>
        )}
      </>
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};
