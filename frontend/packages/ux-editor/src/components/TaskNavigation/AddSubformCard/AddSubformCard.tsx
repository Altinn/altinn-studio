import React from 'react';
import { StudioCard, StudioHeading } from '@studio/components-legacy';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './AddSubformCard.module.css';
import { useTranslation } from 'react-i18next';

export type AddSubformCardProps = {
  onAddSubform?: () => void;
};

export const AddSubformCard = ({ onAddSubform }: AddSubformCardProps) => {
  const { t } = useTranslation();

  //TODO: Implement subform creation functionality in PR #15032
  const onClick = () => {
    if (onAddSubform) {
      onAddSubform();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <StudioCard
      onClick={onClick}
      className={classes.card}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role='button'
      aria-label={t('ux_editor.task_card_add_new_subform')}
    >
      <div className={classes.iconContainer}>{<PlusIcon />}</div>
      <div className={classes.content}>
        <StudioHeading size='2xs'>{t('ux_editor.task_card_add_new_subform')}</StudioHeading>
      </div>
    </StudioCard>
  );
};
