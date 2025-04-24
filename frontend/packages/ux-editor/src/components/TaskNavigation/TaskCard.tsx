import React, { useState, type MouseEvent } from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { StudioIconCard } from '@studio/components-legacy/src/components/StudioIconCard/StudioIconCard';
import { PencilIcon } from '@studio/icons';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDeleteButton,
  StudioHeading,
  StudioParagraph,
} from '@studio/components-legacy';
import { useLayoutSetIcon } from '../../hooks/useLayoutSetIcon';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks/useAppContext';
import { TaskCardEditing } from './TaskCardEditing';
import classes from './TaskCard.module.css';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);
  const { setSelectedFormLayoutSetName } = useAppContext();
  const editCardsFeatureFlag = shouldDisplayFeature(FeatureFlag.TaskNavigationEditCards);

  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = useLayoutSetIcon(layoutSetModel);

  const [editing, setEditing] = useState(false);

  const contextButtons =
    editCardsFeatureFlag || layoutSetModel.type === 'subform' ? (
      <>
        {editCardsFeatureFlag && (
          <StudioButton
            variant='tertiary'
            onClick={(_: MouseEvent<HTMLButtonElement>) => {
              setEditing(true);
            }}
          >
            <PencilIcon /> {t('ux_editor.task_card.edit')}
          </StudioButton>
        )}
        {layoutSetModel.type === 'subform' && (
          <StudioDeleteButton
            variant='tertiary'
            confirmMessage={t('ux_editor.delete.subform.confirm')}
            onDelete={() => {
              deleteLayoutSet({ layoutSetIdToUpdate: layoutSetModel.id });
            }}
          >
            {t('general.delete')}
          </StudioDeleteButton>
        )}
      </>
    ) : null;

  if (editing) {
    return <TaskCardEditing layoutSetModel={layoutSetModel} onClose={() => setEditing(false)} />;
  }

  const goToFormEditor = () => {
    setSelectedFormLayoutSetName(layoutSetModel.id);
  };

  return (
    <StudioIconCard
      icon={taskIcon.icon}
      iconColor={taskIcon.iconColor}
      contextButtons={contextButtons}
    >
      <div className={classes.details}>
        <div>
          <StudioParagraph size='sm'>{t(taskName)}</StudioParagraph>
          <StudioHeading size='xs'>{layoutSetModel.id}</StudioHeading>
        </div>
        <StudioParagraph size='sm'>
          {t('ux_editor.task_card.datamodel')}
          {layoutSetModel.dataType && ' ' + layoutSetModel.dataType}
        </StudioParagraph>
      </div>
      <StudioButton
        className={classes.navigateButton}
        onClick={goToFormEditor}
        color='second'
        variant='primary'
      >
        {t('ux_editor.task_card.ux_editor')}
      </StudioButton>
    </StudioIconCard>
  );
};
