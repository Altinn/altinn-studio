import React from 'react';
import { StudioHeading } from '@studio/components';
import { RequiredIndicator } from '../../RequiredIndicator';
import classes from './HeaderMainConfig.module.css';
import { useTranslation } from 'react-i18next';

export const HeaderMainConfig = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={classes.componentMainConfig}>
      <StudioHeading size='2xs'>
        {t('ux_editor.component_properties.main_configuration')}
        <RequiredIndicator />
      </StudioHeading>
    </div>
  );
};
