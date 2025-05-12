import React from 'react';
import classes from './OldDynamicsInfo.module.css';
import { ExternalLinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { giteaEditLink, altinnDocsUrl } from 'app-shared/ext-urls';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks';
import { Link } from '@digdir/designsystemet-react';

/**
 * @deprecated This component is deprecated and will be removed in a future release.
 */
export const OldDynamicsInfo = () => {
  const { t } = useTranslation();
  const { selectedFormLayoutSetName } = useAppContext();
  const { app, org } = useStudioEnvironmentParams();
  const dynamicLocation = selectedFormLayoutSetName
    ? `App/ui/${selectedFormLayoutSetName}/RuleHandler.js`
    : 'App/ui/RuleHandler.js';
  return (
    <div>
      <div className={classes.header}>{t('right_menu.dynamics')}</div>
      <div>
        <p>
          {t('right_menu.dynamics_description')}
          <br />
          <Link
            className={classes.externalLink}
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/logic/dynamic/' })}
            rel='noopener noreferrer'
            target='_blank'
          >
            {t('right_menu.dynamics_link')}
            <span className={classes.externalLinkIcon}>
              <ExternalLinkIcon />
            </span>
          </Link>
        </p>
        <Link
          className={classes.textLink}
          href={giteaEditLink(org, app, dynamicLocation)}
          target='_blank'
          rel='noreferrer'
        >
          {t('right_menu.dynamics_edit')}
        </Link>{' '}
        {t('right_menu.dynamics_edit_comment')}
      </div>
    </div>
  );
};
