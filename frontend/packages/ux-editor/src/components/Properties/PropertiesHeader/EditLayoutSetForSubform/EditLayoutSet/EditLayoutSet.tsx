import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { UndefinedLayoutSet } from './UndefinedLayoutSet/UndefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';

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
        existingLayoutSetForSubform={existingLayoutSetForSubform}
        onUpdateLayoutSet={onUpdateLayoutSet}
        onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
      />
    );
  }

  const layoutSetIsUndefined = !existingLayoutSetForSubform;
  if (layoutSetIsUndefined) {
    return (
      <UndefinedLayoutSet
        label={t('ux_editor.component_properties.subform.selected_layout_set_label')}
        onClick={() => setIsLayoutSetSelectorVisible(true)}
      />
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubform={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};
