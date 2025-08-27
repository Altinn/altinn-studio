import React from 'react';
import classes from './RequiredIndicator.module.css';
import { StudioTag } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';

export const RequiredIndicator = () => {
  const { t } = useTranslation();

  return (
    <StudioTag size='sm' className={classes.requiredIndicator} color='warning'>
      {t('general.required')}
    </StudioTag>
  );
};
