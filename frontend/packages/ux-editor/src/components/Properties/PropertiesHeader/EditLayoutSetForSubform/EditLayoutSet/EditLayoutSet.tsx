import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import { StudioProperty, StudioRecommendedNextAction } from '@studio/components';
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
  const [showCreateSubformCard, setShowCreateSubformCard] = useState<boolean>(false);

  if (existingLayoutSetForSubform) {
    return <DefinedLayoutSet existingLayoutSetForSubform={existingLayoutSetForSubform} />;
  }

  return (
    <StudioRecommendedNextAction
      title={t('ux_editor.component_properties.subform.choose_layout_set_header')}
      description='Velg først underskjemaet du vil bruke i Tabell for underskjema. Deretter kan du sette opp egenskapene for komponenten.'
      hideSaveButton={true}
      hideSkipButton={true}
    >
      {showCreateSubformCard ? (
        <CreateNewSubformLayoutSet
          layoutSets={layoutSets}
          onSubformCreated={onSubformCreated}
          setShowCreateSubformCard={setShowCreateSubformCard}
        />
      ) : (
        <>
          <SelectLayoutSet
            existingLayoutSetForSubform={existingLayoutSetForSubform}
            onUpdateLayoutSet={onUpdateLayoutSet}
          />
          <StudioProperty.Button
            className={classes.button}
            property={t('ux_editor.component_properties.subform.create_layout_set_button')}
            icon={<PlusIcon />}
            onClick={() => setShowCreateSubformCard(true)}
          />
        </>
      )}
    </StudioRecommendedNextAction>
  );
};
