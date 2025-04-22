import React from 'react';
import { StudioCard, StudioHeading } from '@studio/components-legacy';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './AddNewTask.module.css';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const AddNewTask = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleClick = () =>
    navigate(`../${RoutePaths.ProcessEditor}?returnTo=${RoutePaths.UIEditor}`);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <StudioCard
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={classes.card}
      tabIndex={0}
      role='button'
    >
      <div className={classes.iconContainer}>{<PlusIcon />}</div>
      <div className={classes.content}>
        <StudioHeading size='2xs'>{t('ux_editor.task_card_add_new_task')}</StudioHeading>
      </div>
    </StudioCard>
  );
};
