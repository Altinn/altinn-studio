import React from 'react';
import classes from './Dynamics.module.css';
import { LogicMode } from '../../types/global';
import { ExternalLink } from '@navikt/ds-icons';
import { useText } from '../../hooks';
import { Link } from '@mui/material';
import { useParams } from 'react-router-dom';

interface DynamicsProps {
  toggleFileEditor: (mode?: LogicMode) => void;
}

export const Dynamics = ({ toggleFileEditor }: DynamicsProps) => {
  const t = useText();
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
              <ExternalLink />
            </span>
          </a>
        </p>
        <Link className={classes.textLink} href={dynamicLink} target='_blank'>
          {t('right_menu.dynamics_edit')}
        </Link>
      </div>
    </div>
  );
};
