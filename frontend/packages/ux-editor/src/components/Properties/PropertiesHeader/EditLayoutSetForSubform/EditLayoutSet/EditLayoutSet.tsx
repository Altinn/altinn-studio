import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import { StudioProperty, StudioRecommendedNextAction } from '@studio/components';
import { Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon } from '@studio/icons';
import classes from './EditLayoutSet.module.css';
import { CreateNewSubform } from './CreateNewSubform';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
}: EditLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible] = useState<boolean>(false);
  const [showCreateSubform, setShowCreateSubform] = useState<boolean>(false);

  function handleClick() {
    setShowCreateSubform(true);
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
          {/* TODO: add functionalty */}
          <StudioProperty.Button
            className={classes.button}
            property={t('ux_editor.component_properties.subform.create_layout_set_button')}
            icon={<PlusIcon />}
            onClick={handleClick}
          />
        </StudioRecommendedNextAction>
        {showCreateSubform && (
          <CreateNewSubform
            layoutSetName={existingLayoutSetForSubform}
            dataModelValue={existingLayoutSetForSubform}
            handleNameChange={onUpdateLayoutSet}
            onChangeDataModel={onUpdateLayoutSet}
            onSaveClick={() => {
              // Save the new layout set and then hide the create subform
              //TODO: Implement save function and then hide the create subform
              setShowCreateSubform(false);
            }}
          />
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
