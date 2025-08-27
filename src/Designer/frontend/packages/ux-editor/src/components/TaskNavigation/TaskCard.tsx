import React, { useState, type MouseEvent } from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { StudioIconCard } from '@studio/components-legacy/components/StudioIconCard/StudioIconCard';
import { PencilIcon } from 'libs/studio-icons/src';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton, StudioHeading } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { getLayoutSetIcon } from '../../utils/getLayoutSetIcon';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks/useAppContext';
import { TaskCardEditing } from './TaskCardEditing';
import classes from './TaskCard.module.css';
import { ExportForm } from '../Elements/ExportForm';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);
  const { setSelectedFormLayoutSetName } = useAppContext();
  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = getLayoutSetIcon(layoutSetModel);

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
    setSelectedFormLayoutSetName(layoutSetModel.id);
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
          <StudioHeading size='xs' title={layoutSetModel.id}>
            {layoutSetModel.id}
          </StudioHeading>
        </div>
        <StudioParagraph title={layoutSetModel.dataType}>
          {t('ux_editor.task_card.datamodel')}
          {layoutSetModel.dataType && ' ' + layoutSetModel.dataType}
        </StudioParagraph>
      </div>
      <StudioButton onClick={goToFormEditor} color='second' variant='primary'>
        {t('ux_editor.task_card.ux_editor')}
      </StudioButton>
    </StudioIconCard>
  );
};
