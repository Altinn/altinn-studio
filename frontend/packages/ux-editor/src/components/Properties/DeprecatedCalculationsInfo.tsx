import React from 'react';
import { Alert, Heading, Link } from '@digdir/designsystemet-react';
import { ExternalLinkIcon } from '@studio/icons';
import { StudioParagraph } from '@studio/components';
import { useAppContext } from '../../hooks';
import classes from './Calculations.module.css';
import { altinnDocsUrl, giteaEditLink } from 'app-shared/ext-urls';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { WindowWithRuleModel } from '@altinn/ux-editor/hooks/queries/useRuleModelQuery';
import { useTranslation } from 'react-i18next';

export const DeprecatedCalculationsInfo = () => {
  const { t } = useTranslation();
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const calculationsLocation = `App/ui/${selectedFormLayoutSetName}/RuleHandler.js`;

  const ruleHandlerExist = (window as WindowWithRuleModel).ruleHandlerObject !== undefined;

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
        </Link>
      </Alert>
      <div>
        {ruleHandlerExist && (
          <Link
            href={giteaEditLink(org, app, calculationsLocation)}
            target='_blank'
            rel='noreferrer'
          >
            {t('right_menu.rules_calculations_edit_in_gitea')}
            <ExternalLinkIcon />
          </Link>
        )}
      </div>
    </div>
  );
};
