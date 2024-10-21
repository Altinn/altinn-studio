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
      <StudioRecommendedNextAction
        onSave={undefined}
        saveButtonText={null}
        onSkip={undefined}
        skipButtonText={null}
        title={t('ux_editor.component_properties.subform.choose_layout_set_header')}
        description={t('ux_editor.component_properties.subform.choose_layout_set_description')}
        hideSaveButton={true}
        hideSkipButton={true}
      >
        <SelectLayoutSet
          existingLayoutSetForSubForm={existingLayoutSetForSubform}
          onUpdateLayoutSet={onUpdateLayoutSet}
          onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
          showButtons={false}
        />
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
