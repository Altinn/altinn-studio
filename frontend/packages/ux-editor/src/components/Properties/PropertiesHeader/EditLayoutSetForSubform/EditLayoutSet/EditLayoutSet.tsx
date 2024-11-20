import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { SubformUtilsImpl } from '@altinn/ux-editor/classes/SubformUtils';
import { SubformInstructions } from './SubformInstructions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';

export const EditLayoutSet = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { t } = useTranslation();
  const [showCreateSubformCard, setShowCreateSubformCard] = useState<boolean>(false);
  const [selectedSubform, setSelectedSubform] = useState<string>(undefined);
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { createSubform, isPendingLayoutSetMutation } = useCreateSubform();
  const subformUtils = new SubformUtilsImpl(layoutSets.sets);
  const hasSubforms = subformUtils.hasSubforms;
  const { title, description } = subformUtils.recommendedNextActionText;

  const handleUpdatedComponent = (subform: string) => {
    const updatedComponent = { ...component, layoutSet: subform };
    handleComponentChange(updatedComponent);
  };

  const handleSelectSubformSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const formData: FormData = new FormData(e.currentTarget);
    const subform = formData.get('subform') as string;
    handleComponentChange({ ...component, layoutSet: subform });
  };

  const handleCreateSubformSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const formData: FormData = new FormData(e.currentTarget);
    const newSubformName = formData.get('subform') as string;
    const subformDataType = formData.get('subformDataType') as string;

    createSubform({
      layoutSetName: newSubformName,
      onSubformCreated: handleUpdatedComponent,
      dataType: subformDataType,
    });
  };

  return (
    <StudioRecommendedNextAction
      title={t(title)}
      description={t(description)}
      hideSaveButton={true}
      hideSkipButton={true}
      onSave={
        showCreateSubformCard || !hasSubforms
          ? handleCreateSubformSubmit
          : handleSelectSubformSubmit
      }
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
          isPendingLayoutSetMutation={isPendingLayoutSetMutation}
          setShowCreateSubformCard={setShowCreateSubformCard}
          hasSubforms={hasSubforms}
        />
      ) : (
        <>
          <SelectLayoutSet
            setSelectedSubform={setSelectedSubform}
            selectedSubform={selectedSubform}
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
            type='submit'
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
