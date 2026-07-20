import React from 'react';
import { StudioButton } from '@studio/components';
import { StarFillIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ComponentButton.module.css';

type ComponentButtonProps = {
  tooltipContent: string;
  selected: boolean;
  icon: React.ComponentType;
  onClick: () => void;
  inline?: boolean;
  isFavorite?: boolean;
};
export function ComponentButton({
  tooltipContent,
  selected,
  icon,
  onClick,
  inline,
  isFavorite = false,
}: ComponentButtonProps) {
  const { t } = useTranslation();
  return (
    <StudioButton
      variant={selected ? 'primary' : 'secondary'}
      onClick={onClick}
      aria-label={
        isFavorite
          ? t('ux_editor.add_item.favorite_component_label', { component: tooltipContent })
          : tooltipContent
      }
      className={inline ? classes.componentButtonInline : classes.componentButton}
      title={tooltipContent}
    >
      {isFavorite && <StarFillIcon className={classes.favoriteBadge} aria-hidden />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {React.createElement(icon, { fontSize: '1.5rem' } as any)}
        {tooltipContent}
      </div>
    </StudioButton>
  );
}
