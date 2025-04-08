import React from 'react';
import { StudioCard, StudioHeading } from '@studio/components-legacy';
import { PlusIcon } from '@studio/icons';
import classes from './AddSubformCard.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { SubformCardEditMode } from './CreateSubformMode';

export type AddSubformCardProps = {
  isSubformInEditMode: boolean;
  setIsCreateSubformMode: (isSubformInEditMode: boolean) => void;
};

export const AddSubformCard = ({
  setIsCreateSubformMode,
  isSubformInEditMode,
}: AddSubformCardProps) => {
  const { t } = useTranslation();

  const handleCreateSubformMode = () => {
    setIsCreateSubformMode(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCreateSubformMode();
    }
  };

  if (isSubformInEditMode) {
    return <SubformCardEditMode setIsCreateSubformMode={setIsCreateSubformMode} />;
  }

  return (
    <StudioCard
      className={cn(classes.card, classes.cardDefault)}
      onClick={handleCreateSubformMode}
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
