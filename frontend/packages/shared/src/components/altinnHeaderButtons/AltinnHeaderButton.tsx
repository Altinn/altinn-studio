import React from 'react';
import classes from './AltinnHeaderButton.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Link } from '@digdir/design-system-react';
import { AltinnButtonActionItem } from '../altinnHeader/types';

export interface AltinnHeaderButtonProps {
  action: AltinnButtonActionItem;
}

export const AltinnHeaderButton = ({ action }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  if (!action) return null;

  return (
    <Link
      href={action.to}
      className={cn(
        classes.linkButton,
        action.isInverted ? classes.invertedButton : classes.normalButton,
      )}
      key={action.menuKey}
      data-testid={action.menuKey}
      aria-label={t(action.title)}
    >
      {t(action.title)}
    </Link>
  );
};
