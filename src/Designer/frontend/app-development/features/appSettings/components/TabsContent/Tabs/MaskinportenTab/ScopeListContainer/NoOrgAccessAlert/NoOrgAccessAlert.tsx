import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';
import { LoggedInTitle } from '../LoggedInTitle';
import classes from './NoOrgAccessAlert.module.css';

export function NoOrgAccessAlert(): ReactElement {
  const { t } = useTranslation();

  return (
    <div>
      <LoggedInTitle />
      <StudioAlert data-color='warning' className={classes.noOrgAccessAlert}>
        <StudioHeading data-size='2xs' level={4}>
          {t('app_settings.maskinporten_no_org_access_title')}
        </StudioHeading>
        <StudioParagraph>
          {t('app_settings.maskinporten_no_org_access_description')}
        </StudioParagraph>
      </StudioAlert>
    </div>
  );
}
