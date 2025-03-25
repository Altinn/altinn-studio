import React, { forwardRef } from 'react';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useTranslation } from 'react-i18next';
import classes from './ActionButton.module.css';
import { StudioButton } from '@studio/components-legacy';
import type { StudioButtonProps } from '@studio/components-legacy';

export interface ActionButtonProps extends StudioButtonProps {
  titleKey: TranslationKey;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ titleKey, ...rest }, ref) => {
    const { t } = useTranslation();
    return (
      <StudioButton
        className={classes.actionButton}
        ref={ref}
        title={t(titleKey)}
        variant='tertiary'
        {...rest}
      />
    );
  },
);

ActionButton.displayName = 'ActionButton';
