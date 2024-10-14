import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import { StudioRecommendedNextAction } from '@studio/components';

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

  const renderSelectLayoutSet = (
    <SelectLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onUpdateLayoutSet={onUpdateLayoutSet}
      onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
    />
  );

  if (isLayoutSetSelectorVisible) return renderSelectLayoutSet;

  const layoutSetIsUndefined = !existingLayoutSetForSubform;
  if (layoutSetIsUndefined) {
    return (
      <StudioRecommendedNextAction
        title={t('ux_editor.component_properties.subform.choose_layout_set_header')}
        description={t('ux_editor.component_properties.subform.choose_layout_set_description')}
        saveButtonText={undefined}
        skipButtonText={undefined}
        hideSaveButton={true}
        onSave={undefined}
        onSkip={undefined}
      >
        {isLayoutSetSelectorVisible || renderSelectLayoutSet}
      </StudioRecommendedNextAction>
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};
