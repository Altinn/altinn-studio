import React from 'react';
import classes from './RequiredIndicator.module.css';
import { StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const RequiredIndicator = () => {
  const { t } = useTranslation();

  return (
    <StudioTag data-size='sm' className={classes.requiredIndicator} data-color='warning'>
      {t('general.required')}
    </StudioTag>
  );
};
