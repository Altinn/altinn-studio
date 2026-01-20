import React, { type ReactElement } from 'react';
import { StudioDeleteButton } from '../../StudioDeleteButton';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioConfigCardHeader.module.css';

export type StudioConfigCardHeaderProps = {
  cardLabel: string;
  isDeleteDisabled?: boolean;
  deleteAriaLabel: string;
  confirmDeleteMessage?: string;
  onDelete: () => void;
};

export function StudioConfigCardHeader({
  cardLabel,
  isDeleteDisabled,
  deleteAriaLabel,
  confirmDeleteMessage,
  onDelete,
}: StudioConfigCardHeaderProps): ReactElement {
  return (
    <div className={classes.cardHeading}>
      <StudioParagraph className={classes.cardTitle}>{cardLabel}</StudioParagraph>
      <StudioDeleteButton
        disabled={isDeleteDisabled}
        confirmMessage={confirmDeleteMessage}
        onDelete={onDelete}
        aria-label={deleteAriaLabel}
        variant='tertiary'
        data-color='accent'
      />
    </div>
  );
}
