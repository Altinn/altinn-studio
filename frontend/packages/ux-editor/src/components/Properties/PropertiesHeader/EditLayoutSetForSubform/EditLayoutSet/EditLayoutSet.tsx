import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import { StudioParagraph, StudioProperty, StudioRecommendedNextAction } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import classes from './EditLayoutSet.module.css';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
  onSubformCreated: (layoutSetName: string) => void;
  layoutSets: LayoutSets;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
  onSubformCreated,
  layoutSets,
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
        existingLayoutSetForSubform={existingLayoutSetForSubform}
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
          <StudioParagraph size='sm'>
            {t('ux_editor.component_properties.subform.create_layout_set_description')}
          </StudioParagraph>
          <SelectLayoutSet
            existingLayoutSetForSubform={existingLayoutSetForSubform}
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
        {showCreateSubform && (
          <CreateNewSubformLayoutSet layoutSets={layoutSets} onSubformCreated={onSubformCreated} />
        )}
      </>
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubform={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};
