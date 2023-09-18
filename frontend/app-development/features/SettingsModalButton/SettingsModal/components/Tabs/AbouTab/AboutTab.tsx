import React, { ReactNode } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';

export type AboutTabProps = {};

export const AboutTab = ({}: AboutTabProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
    </div>
  );
};
