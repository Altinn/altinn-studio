import React from 'react';
import { StudioHeading } from '@studio/components-legacy';
import { RequiredIndicator } from '../../RequiredIndicator';
import classes from './HeaderMainConfig.module.css';
import { useTranslation } from 'react-i18next';

export const HeaderMainConfig = (): JSX.Element => {
  const { t } = useTranslation();

  const headingId = 'main-config-heading';
  const requiredIndicatorId = 'main-config-required-indicator';

  return (
    <section
      className={classes.componentMainConfig}
      aria-labelledby={headingId}
      aria-describedby={requiredIndicatorId}
    >
      <div className={classes.flexContainer}>
        <StudioHeading id={headingId} size='2xs'>
          {t('ux_editor.component_properties.main_configuration')}
        </StudioHeading>
        <span id={requiredIndicatorId}>
          <RequiredIndicator />
        </span>
      </div>
    </section>
  );
};
