import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { UndefinedLayoutSet } from './UndefinedLayoutSet/UndefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';

type EditLayoutSetProps = {
  layoutSetsActingAsSubform: string[];
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const EditLayoutSet = ({
  layoutSetsActingAsSubform,
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
}: EditLayoutSetProps) => {
  const [layoutSetSelectVisible, setLayoutSetSelectVisible] = useState<boolean>(false);
  const { t } = useTranslation();

  return (
    <>
      {!existingLayoutSetForSubform && !layoutSetSelectVisible ? (
        <UndefinedLayoutSet
          label={t('ux_editor.component_properties.subform.selected_layout_set_label')}
          onClick={() => setLayoutSetSelectVisible(true)}
        />
      ) : layoutSetSelectVisible ? (
        <SelectLayoutSet
          layoutSetsActingAsSubForm={layoutSetsActingAsSubform}
          existingLayoutSetForSubForm={existingLayoutSetForSubform}
          onUpdateLayoutSet={onUpdateLayoutSet}
          onSetLayoutSetSelectVisible={setLayoutSetSelectVisible}
        />
      ) : (
        <DefinedLayoutSet
          existingLayoutSetForSubForm={existingLayoutSetForSubform}
          onClick={() => setLayoutSetSelectVisible(true)}
        />
      )}
    </>
  );
};
