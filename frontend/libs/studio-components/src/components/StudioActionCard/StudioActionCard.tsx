import React, { forwardRef, type Ref } from 'react';
import { StudioCard } from '../StudioCard';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';
import { PlusIcon } from '@studio/icons';
import classes from './StudioActionCard.module.css';
import cn from 'classnames';

export type StudioActionCardProps = {
  label: string;
  className?: string;
  onAction: () => void;
};

const StudioActionCard = (
  { label, className, onAction }: StudioActionCardProps,
  ref: Ref<React.ElementRef<typeof StudioCard>>,
): React.ReactElement => {
  const classNames = cn(classes.studioActionCard, className);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAction();
    }
  };

  return (
    <StudioCard
      onClick={onAction}
      onKeyDown={handleKeyDown}
      className={classNames}
      tabIndex={0}
      role='button'
      ref={ref}
    >
      <PlusIcon className={classes.iconContainer} />
      <StudioLabelAsParagraph className={classes.paragraphLabel} data-size='md'>
        {label}
      </StudioLabelAsParagraph>
    </StudioCard>
  );
};

const ForwardedStudioActionCard = forwardRef(StudioActionCard);
export { ForwardedStudioActionCard as StudioActionCard };
