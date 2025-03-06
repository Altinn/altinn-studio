import React, { type MouseEvent } from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { StudioIconCard } from '@studio/components/src/components/StudioIconCard/StudioIconCard';
import { PencilIcon } from '@studio/icons';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton, StudioParagraph } from '@studio/components';
import { useLayoutSetIcon } from '../../hooks/useLayoutSetIcon';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();

  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = useLayoutSetIcon(layoutSetModel);
  const contextButtons = (
    <>
      <StudioButton
        variant='tertiary'
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          /* TODO: Implement editing mode */
        }}
      >
        <PencilIcon /> {t('ux_editor.task_card.edit')}
      </StudioButton>
      <StudioDeleteButton
        variant='tertiary'
        onDelete={() => {
          /* TODO: Call delete on task */
        }}
      >
        {t('general.delete')}
      </StudioDeleteButton>
    </>
  );

  return (
    <StudioIconCard
      icon={taskIcon.icon}
      iconColor={taskIcon.iconColor}
      header={t(taskName)}
      contextButtons={contextButtons}
    >
      <StudioParagraph size='sm'>{layoutSetModel.id}</StudioParagraph>
      <StudioParagraph size='sm'>
        {t('ux_editor.task_card.datamodel')}
        {layoutSetModel.dataType && ' ' + layoutSetModel.dataType}
      </StudioParagraph>
      <StudioButton color='second' variant='primary'>
        {t('ux_editor.task_card.ux_editor')}
      </StudioButton>
    </StudioIconCard>
  );
};
