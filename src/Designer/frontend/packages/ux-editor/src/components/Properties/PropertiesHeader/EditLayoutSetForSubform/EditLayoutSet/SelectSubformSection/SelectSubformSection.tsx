import React, { useState } from 'react';
import { StudioNativeSelect, StudioRecommendedNextAction } from '@studio/components-legacy';
import { CheckmarkIcon, PlusIcon } from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import classes from './SelectSubformSection.module.css';
import { StudioButton, StudioProperty } from '@studio/components';

type SelectSubformSectionProps = {
  setShowCreateSubformCard: (showCreateSubformCard: boolean) => void;
  onComponentUpdate: (subform: string) => void;
  recommendedNextActionText: {
    title: string;
    description: string;
  };
  subformLayoutSetsIds: string[];
};

export const SelectSubformSection = ({
  setShowCreateSubformCard,
  onComponentUpdate,
  recommendedNextActionText: { title, description },
  subformLayoutSetsIds,
}: SelectSubformSectionProps) => {
  const [selectedSubform, setSelectedSubform] = useState<string>(undefined);
  const { t } = useTranslation();

  const handleSelectSubformSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const formData: FormData = new FormData(e.currentTarget);
    const subform = formData.get('subform') as string;
    onComponentUpdate(subform);
  };

  return (
    <StudioRecommendedNextAction
      title={t(title)}
      description={t(description)}
      hideSaveButton={true}
      hideSkipButton={true}
      onSave={handleSelectSubformSubmit}
    >
      <StudioNativeSelect
        name='subform'
        className={classes.layoutSetsOption}
        size='small'
        onChange={(e) => setSelectedSubform(e.target.value)}
        label={t('ux_editor.component_properties.subform.choose_layout_set_label')}
        value={selectedSubform}
      >
        <option value=''>{t('ux_editor.component_properties.subform.choose_layout_set')}</option>
        {subformLayoutSetsIds.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </StudioNativeSelect>
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
        disabled={!selectedSubform}
        variant='primary'
      >
        {t('ux_editor.component_properties.subform.save_button')}
      </StudioButton>
    </StudioRecommendedNextAction>
  );
};
