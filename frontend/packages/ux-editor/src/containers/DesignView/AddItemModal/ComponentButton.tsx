import React from 'react';
import { StudioButton } from '@studio/components';
import classes from './ComponentButton.module.css';

type ComponentButtonProps = {
  tooltipContent: string;
  selected: boolean;
  icon: React.ComponentType;
  onClick: () => void;
  inline?: boolean;
};
export function ComponentButton({
  tooltipContent,
  selected,
  icon,
  onClick,
  inline,
}: ComponentButtonProps) {
  return (
    <StudioButton
      variant={selected ? 'primary' : 'secondary'}
      onClick={onClick}
      size='sm'
      aria-label={tooltipContent}
      className={inline ? classes.componentButtonInline : classes.componentButton}
      title={tooltipContent}
      icon={React.createElement(icon, { fontSize: '1.5rem' } as any)}
    >
      {tooltipContent}
    </StudioButton>
  );
}
