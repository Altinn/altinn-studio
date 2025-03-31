import React from 'react';
import { StudioCard, StudioHeading } from '@studio/components-legacy';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './AddSubformCard.module.css';
import { useTranslation } from 'react-i18next';

export const AddSubformCard = () => {
  const { t } = useTranslation();

  //TODO:  Implement handleClick will be implemented in a later PR: 15032
  const handleClick = () => {};

  return (
    <StudioCard onClick={handleClick} className={classes.card}>
      <div className={classes.iconContainer}>{<PlusIcon />}</div>
      <div className={classes.content}>
        <StudioHeading size='2xs'>{t('ux_editor.task_card_add_new_subform')}</StudioHeading>
      </div>
    </StudioCard>
  );
};
