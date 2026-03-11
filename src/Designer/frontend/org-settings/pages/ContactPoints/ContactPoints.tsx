import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import classes from './ContactPoints.module.css';

export const ContactPoints = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>{t('org.settings.contact_points.contact_points')}</StudioHeading>
    </div>
  );
};
