import React, { useState } from 'react';
import { Alert } from '@digdir/designsystemet-react';
import classes from './ConditionalRendering.module.css';
import { PlusIcon } from '@studio/icons';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';
import { Trans } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioButton } from '@studio/components';

/**
 * @deprecated This component is deprecated and will be removed in a future release.
 */
export const ConditionalRendering = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const t = useText();
  return (
    <div className={classes.conditionalRendering}>
      <div>
        <Alert severity='warning' size='small'>
          <span>
            <Trans i18nKey={'right_menu.warning_dynamics_deprecated'}>
              <a
                href={altinnDocsUrl('altinn-studio/designer/build-app/expressions')}
                target='_newTab'
                rel='noopener noreferrer'
              />
            </Trans>
          </span>
        </Alert>
        <div className={classes.header}>
          <span>{t('right_menu.rules_conditional_rendering')}</span>
          <StudioButton
            aria-label={t('right_menu.rules_conditional_rendering_add_alt')}
            icon={<PlusIcon />}
            onClick={() => setModalOpen(true)}
            variant='tertiary'
            size='small'
          />
        </div>
        <div>
          <ConditionalRenderingModal
            modalOpen={modalOpen}
            handleClose={() => setModalOpen(false)}
            handleOpen={() => setModalOpen(true)}
          />
        </div>
      </div>
      <Divider marginless />
      <OldDynamicsInfo />
    </div>
  );
};
