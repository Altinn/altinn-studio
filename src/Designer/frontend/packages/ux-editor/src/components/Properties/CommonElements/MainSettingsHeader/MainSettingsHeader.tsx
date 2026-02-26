import React from 'react';
import { StudioHeading, StudioTag } from '@studio/components';
import classes from './MainSettingsHeader.module.css';
import { useTranslation } from 'react-i18next';

export const MainSettingsHeader = (): JSX.Element => {
  const { t } = useTranslation();

  const headingId = 'main-config-heading';
  const requiredIndicatorId = 'main-config-required-indicator';

  return (
    <section
      className={classes.wrapper}
      aria-labelledby={headingId}
      aria-describedby={requiredIndicatorId}
    >
      <div className={classes.flexContainer}>
        <StudioHeading id={headingId} className={classes.heading}>
          {t('ux_editor.component_properties.main_configuration')}
        </StudioHeading>
        <span id={requiredIndicatorId}>
          <StudioTag className={classes.requiredIndicator} data-color='warning'>
            {t('general.required')}
          </StudioTag>
        </span>
      </div>
    </section>
  );
};
