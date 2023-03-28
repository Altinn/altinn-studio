import React from 'react';
import classes from './Dynamics.module.css';
import { ExternalLinkIcon } from '@navikt/aksel-icons';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Dynamics = () => {
  const { t } = useTranslation();
  const { app, org } = useParams();
  const dynamicLink = `/repos/${org}/${app}/_edit/master/App/ui/RuleHandler.js`;
  return (
    <div>
      <div className={classes.header}>{t('right_menu.dynamics')}</div>
      <div>
        <p>
          {t('right_menu.dynamics_description')}
          <br />
          <a
            className={classes.externalLink}
            href='https://docs.altinn.studio/nb/app/development/logic/dynamic/'
            rel='noopener noreferrer'
            target='_blank'
          >
            {t('right_menu.dynamics_link')}
            <span className={classes.externalLinkIcon}>
              <ExternalLinkIcon />
            </span>
          </a>
        </p>
        <a className={classes.textLink} href={dynamicLink} target='_blank' rel='noreferrer'>
          {t('right_menu.dynamics_edit')}
        </a>{' '}
        ({t('right_menu.dynamics_edit_comment')})
      </div>
    </div>
  );
};
