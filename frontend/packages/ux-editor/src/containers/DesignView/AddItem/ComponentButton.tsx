import React from 'react';
import { StudioButton } from '@studio/components-legacy';
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
      size='xs'
      aria-label={tooltipContent}
      className={inline ? classes.componentButtonInline : classes.componentButton}
      title={tooltipContent}
      color='first'
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {React.createElement(icon, { fontSize: '1.5rem' } as any)}
        {tooltipContent}
      </div>
    </StudioButton>
  );
}
