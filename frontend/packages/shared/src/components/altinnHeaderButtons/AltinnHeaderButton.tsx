import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import classes from './AltinnHeaderButton.module.css';
import { type TopBarMenuDeploymentItem } from 'app-shared/types/TopBarMenuItem';

export interface AltinnHeaderButtonProps {
  deploymentItem: TopBarMenuDeploymentItem;
}

export const AltinnHeaderButton = ({ deploymentItem }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  if (!deploymentItem) return null;

  return (
    <StudioButton
      asChild
      key={deploymentItem.key}
      data-testid={deploymentItem.key}
      aria-label={t(deploymentItem.key)}
      color={deploymentItem.isInverted ? 'inverted' : 'first'}
      variant='secondary'
    >
      <a
        href={deploymentItem.link}
        className={cn({ [classes.inverted]: deploymentItem.isInverted })}
      >
        {t(deploymentItem.key)}
      </a>
    </StudioButton>
  );
};
