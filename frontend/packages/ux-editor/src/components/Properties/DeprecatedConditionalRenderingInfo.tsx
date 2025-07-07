import React from 'react';
import { Alert, Heading, Link } from '@digdir/designsystemet-react';
import { ExternalLinkIcon } from '@studio/icons';
import { useAppContext } from '../../hooks';
import { altinnDocsUrl, giteaEditLink } from 'app-shared/ext-urls';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Trans, useTranslation } from 'react-i18next';

export const DeprecatedConditionalRenderingInfo = () => {
  const { t } = useTranslation();
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const ruleHandlerLocation = `App/ui/${selectedFormLayoutSetName}/RuleHandler.js`;

  return (
    <div>
      <Alert size='small'>
        <Heading size='xxsmall'>
          {t('right_menu.rules_conditional_rendering_deprecated_info_title')}
        </Heading>
        <Trans i18nKey={'right_menu.rules_conditional_rendering_deprecated_info'}>
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/designer/build-app/expressions' })}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </Alert>
      <div>
        <Link href={giteaEditLink(org, app, ruleHandlerLocation)} target='_blank' rel='noreferrer'>
          {t('right_menu.rules_conditional_rendering_edit_in_gitea')}
          <ExternalLinkIcon />
        </Link>
      </div>
    </div>
  );
};
