import { Button, ButtonProps } from '@digdir/design-system-react';
import React, { forwardRef } from 'react';
import { TranslationKey } from '@altinn-studio/language/type';
import { useTranslation } from 'react-i18next';
import classes from './ActionButton.module.css';

export interface ActionButtonProps extends ButtonProps {
  titleKey: TranslationKey;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ titleKey, ...rest }, ref) => {
    const { t } = useTranslation();
    return (
      <Button
        className={classes.actionButton}
        ref={ref}
        size='small'
        title={t(titleKey)}
        variant='tertiary'
        {...rest}
      />
    );
  },
);

ActionButton.displayName = 'ActionButton';
