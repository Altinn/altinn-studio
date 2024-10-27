import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import { StudioProperty, StudioRecommendedNextAction } from '@studio/components';
import { Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon } from '@studio/icons';
import classes from './EditLayoutSet.module.css';
import { CreateNewLayoutSet } from './CreateNewLayoutSet/CreateNewLayoutSet';

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

  function handleClick() {
    setShowCreateSubform(!showCreateSubform);
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
            onClick={handleClick}
          />
        </StudioRecommendedNextAction>
        {showCreateSubform && <CreateNewLayoutSet onSubFormCreated={onSubFormCreated} />}
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
