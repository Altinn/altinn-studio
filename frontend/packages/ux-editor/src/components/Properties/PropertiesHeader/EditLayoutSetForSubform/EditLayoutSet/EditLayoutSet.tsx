import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import {
  StudioButton,
  StudioParagraph,
  StudioProperty,
  StudioRecommendedNextAction,
} from '@studio/components';
import { CheckmarkIcon, PlusIcon } from '@studio/icons';
import classes from './EditLayoutSet.module.css';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { SubformUtilsImpl } from '@altinn/ux-editor/classes/SubformUtils';
import { SubformInstructions } from './SubformInstructions';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
  layoutSets: LayoutSets;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
  layoutSets,
}: EditLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [showCreateSubformCard, setShowCreateSubformCard] = useState<boolean>(false);
  const [selectedSubform, setSelectedSubform] = useState<string>(existingLayoutSetForSubform);

  const subformUtils = new SubformUtilsImpl(layoutSets.sets);
  const hasSubforms = subformUtils.hasSubforms;
  const { title, description } = subformUtils.recommendedNextActionText;

  return (
    <StudioRecommendedNextAction
      title={t(title)}
      description={t(description)}
      hideSaveButton={true}
      hideSkipButton={true}
    >
      {!hasSubforms && (
        <>
          <StudioParagraph size='sm'>
            {t('ux_editor.component_properties.subform.no_existing_layout_set_empty_subform')}
          </StudioParagraph>
          <SubformInstructions />
        </>
      )}
      {showCreateSubformCard || !hasSubforms ? (
        <CreateNewSubformLayoutSet
          layoutSets={layoutSets}
          onUpdateLayoutSet={onUpdateLayoutSet}
          setShowCreateSubformCard={setShowCreateSubformCard}
          hasSubforms={hasSubforms}
        />
      ) : (
        <>
          <SelectLayoutSet
            existingLayoutSetForSubform={existingLayoutSetForSubform}
            setSelectedSubform={setSelectedSubform}
          />
          <StudioProperty.Button
            className={classes.createSubformLinkButton}
            property={t('ux_editor.component_properties.subform.create_layout_set_button')}
            icon={<PlusIcon />}
            onClick={() => setShowCreateSubformCard(true)}
          />
          <StudioButton
            className={classes.saveSubformButton}
            icon={<CheckmarkIcon />}
            onClick={() => onUpdateLayoutSet(selectedSubform)}
            title={t('general.save')}
            disabled={!selectedSubform}
            variant='secondary'
            color='success'
          />
        </>
      )}
    </StudioRecommendedNextAction>
  );
};
