import React from 'react';
import { Alert, Heading, Link } from '@digdir/designsystemet-react';
import { ExternalLinkIcon } from '@studio/icons';
import { StudioParagraph } from '@studio/components';
import { useAppContext, useText } from '../../hooks';
import classes from './Calculations.module.css';
import { altinnDocsUrl, giteaEditLink } from 'app-shared/ext-urls';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const Calculations = () => {
  const t = useText();
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const dynamicLocation = `App/ui/${selectedFormLayoutSetName}/RuleHandler.js`;

  /*
  const isUnknownInternalComponent: boolean = form && !formItemConfigs[form.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={form.type} />;
  }
   */

  return (
    <div className={classes.calculations}>
      <Alert size='small'>
        <Heading size='xxsmall'>{t('right_menu.rules_calculations_deprecated_info_title')}</Heading>
        <StudioParagraph size='small'>
          {t('right_menu.rules_calculations_deprecated_info')}
        </StudioParagraph>
        <Link
          href={altinnDocsUrl('/nb/app/development/logic/dynamic/')}
          rel='noopener noreferrer'
          target='_blank'
        >
          {t('right_menu.dynamics_link')}
          <ExternalLinkIcon />
        </Link>
      </Alert>
      <div>
        <Link href={giteaEditLink(org, app, dynamicLocation)} target='_blank' rel='noreferrer'>
          {t('right_menu.dynamics_edit')}
          <ExternalLinkIcon />
        </Link>
      </div>
    </div>
  );
};
