import React, { type ReactElement } from 'react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const UnDeploy = (): ReactElement => {
  const { t } = useTranslation();

  const handleClick = () => {
    console.log('Undeploy feature will be implemented soon...');
  };

  return (
    <div>
      <StudioButton size='sm' onClick={handleClick}>
        {t('app_deployment.undeploy_button')}
      </StudioButton>
    </div>
  );
};
