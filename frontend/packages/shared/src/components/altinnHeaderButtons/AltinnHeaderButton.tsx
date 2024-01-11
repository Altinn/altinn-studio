import React from 'react';
import classes from './AltinnHeaderButton.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from '../altinnHeader/types';

export interface AltinnHeaderButtonProps {
  action: AltinnButtonActionItem;
}

export const AltinnHeaderButton = ({ action }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  if (!action) return null;

  // Need to keep the link as an 'a' element because the <Link /> component from the designsystem only shows purple color text
  return (
    <a
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
    </a>
  );
};
