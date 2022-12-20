import React from 'react';
import classes from './Dynamics.module.css';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { LogicMode } from '../../types/global';
import { ExternalLink } from '@navikt/ds-icons';

interface DynamicsProps {
  language: object;
  toggleFileEditor: (mode?: LogicMode) => void;
}

export const Dynamics = ({language, toggleFileEditor}: DynamicsProps) => {
  const t = (key: string) => getLanguageFromKey(key, language);
  return <div>
    <div className={classes.header}>{t('right_menu.dynamics')}</div>
    <div>
      <p>
        {t('right_menu.dynamics_description')}
        <br/>
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
      <div className={classes.textLink} onClick={() => toggleFileEditor('Dynamics')}>
        {t('right_menu.dynamics_edit')}
      </div>
    </div>
  </div>;
}
