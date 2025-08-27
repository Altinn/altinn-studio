import React, { forwardRef } from 'react';
import type { TranslationKey } from 'language/type';
import { useTranslation } from 'react-i18next';
import classes from './ActionButton.module.css';
import { StudioButton } from 'libs/studio-components-legacy/src';
import type { StudioButtonProps } from 'libs/studio-components-legacy/src';

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
