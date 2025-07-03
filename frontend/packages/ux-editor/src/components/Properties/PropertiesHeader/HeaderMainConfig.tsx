import React from 'react';
import { StudioHeading } from '@studio/components-legacy';
import { RequiredIndicator } from '../../RequiredIndicator';
import classes from './HeaderMainConfig.module.css';
import { useTranslation } from 'react-i18next';

export const HeaderMainConfig = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <section
      className={classes.componentMainConfig}
      aria-labelledby={'id-of-heading-element'}
      aria-describedby={'require-indicator-element-id'}
    >
      <div className={classes.flexContainer}>
        <StudioHeading size='2xs'>
          {t('ux_editor.component_properties.main_configuration')}
        </StudioHeading>
        <span>
          <RequiredIndicator />
        </span>
      </div>
    </section>
  );
};
