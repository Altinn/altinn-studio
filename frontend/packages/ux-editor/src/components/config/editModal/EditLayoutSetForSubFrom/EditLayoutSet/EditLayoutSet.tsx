import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { UndefinedLayoutSet } from './UndefinedLayoutSet/UndefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import classes from './EditLayoutSet.module.css';
import { RedirectToLayoutSet } from '@altinn/ux-editor/components/config/editModal/EditLayoutSetForSubFrom/EditLayoutSet/RedirectToLayoutSet/RedirectToLayoutSet';

type EditLayoutSetProps = {
  layoutSetsActingAsSubForm: string[];
  existingLayoutSetForSubForm: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const EditLayoutSet = ({
  layoutSetsActingAsSubForm,
  existingLayoutSetForSubForm,
  onUpdateLayoutSet,
}: EditLayoutSetProps) => {
  const [layoutSetSelectVisible, setLayoutSetSelectVisible] = useState<boolean>(false);
  const { t } = useTranslation();

  return (
    <>
      <div className={classes.editLayoutSet}>
        {!existingLayoutSetForSubForm && !layoutSetSelectVisible ? (
          <UndefinedLayoutSet
            label={t('ux_editor.component_properties.subform.selected_layout_set')}
            onClick={() => setLayoutSetSelectVisible(true)}
          />
        ) : layoutSetSelectVisible ? (
          <SelectLayoutSet
            layoutSetsActingAsSubForm={layoutSetsActingAsSubForm}
            existingLayoutSetForSubForm={existingLayoutSetForSubForm}
            onUpdateLayoutSet={onUpdateLayoutSet}
            onSetLayoutSetSelectVisible={setLayoutSetSelectVisible}
          />
        ) : (
          <DefinedLayoutSet
            existingLayoutSetForSubForm={existingLayoutSetForSubForm}
            onClick={() => setLayoutSetSelectVisible(true)}
          />
        )}
      </div>
      {existingLayoutSetForSubForm && (
        <RedirectToLayoutSet selectedSubForm={existingLayoutSetForSubForm} />
      )}
    </>
  );
};
