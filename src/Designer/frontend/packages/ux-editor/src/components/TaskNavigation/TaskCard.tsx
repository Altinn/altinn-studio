import React, { useState, type MouseEvent } from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { PencilIcon } from '@studio/icons';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioParagraph,
  StudioDeleteButton,
  StudioHeading,
  StudioIconCard,
} from '@studio/components';
import { getLayoutSetIcon } from '../../utils/getLayoutSetIcon';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TaskCardEditing } from './TaskCardEditing';
import classes from './TaskCard.module.css';
import { ExportForm } from '../Elements/ExportForm';
import { useNavigate } from 'react-router-dom';
import { useLayoutSetNavigation } from '../../utils/routeUtils';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);
  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = getLayoutSetIcon(layoutSetModel);
  const navigate = useNavigate();
  const { getLayoutSetPath } = useLayoutSetNavigation();

  const [editing, setEditing] = useState(false);

  const contextButtons = (
    <>
      <StudioButton
        variant='tertiary'
        onClick={(_: MouseEvent<HTMLButtonElement>) => {
          setEditing(true);
        }}
      >
        <PencilIcon /> {t('ux_editor.task_card.edit')}
      </StudioButton>
      <ExportForm formLayoutSetName={layoutSetModel.id} />
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
  );

  if (editing) {
    return <TaskCardEditing layoutSetModel={layoutSetModel} onClose={() => setEditing(false)} />;
  }

  const goToFormEditor = () => {
    navigate(getLayoutSetPath(layoutSetModel.id));
  };

  return (
    <StudioIconCard
      icon={taskIcon.icon}
      iconColor={taskIcon.iconColor}
      menuButtonTitle={t('general.menu')}
      contextButtons={contextButtons}
    >
      <div className={classes.details}>
        <div>
          <StudioParagraph>{t(taskName)}</StudioParagraph>
          <StudioHeading title={layoutSetModel.id}>{layoutSetModel.id}</StudioHeading>
        </div>
        <StudioParagraph title={layoutSetModel.dataType}>
          {t('ux_editor.task_card.datamodel')}
          {layoutSetModel.dataType && ' ' + layoutSetModel.dataType}
        </StudioParagraph>
      </div>
      <StudioButton onClick={goToFormEditor} variant='primary'>
        {t('ux_editor.task_card.ux_editor')}
      </StudioButton>
    </StudioIconCard>
  );
};
