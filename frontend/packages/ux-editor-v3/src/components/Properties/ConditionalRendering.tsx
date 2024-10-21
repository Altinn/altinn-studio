import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import classes from './ConditionalRendering.module.css';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { Divider } from 'app-shared/primitives';
import { Trans } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';

export const ConditionalRendering = () => {
  return (
    <div className={classes.conditionalRendering}>
      <div>
        <div className={classes.dynamicsVersionCheckBox}>
          <Divider />
          <Alert severity='warning'>
            <span>
              <Trans i18nKey={'right_menu.warning_dynamics_deprecated'}>
                <a
                  href={altinnDocsUrl({
                    relativeUrl: 'altinn-studio/designer/build-app/expressions',
                  })}
                  target='_newTab'
                  rel='noopener noreferrer'
                />
              </Trans>
            </span>
          </Alert>
        </div>
        <div>
          <ConditionalRenderingModal />
        </div>
      </div>
      <Divider marginless />
      <OldDynamicsInfo />
    </div>
  );
};
