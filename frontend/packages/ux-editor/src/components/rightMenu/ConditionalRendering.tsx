import React, { useState } from 'react';
import { Alert, Button } from '@digdir/design-system-react';
import classes from './ConditionalRendering.module.css';
import { PlusIcon } from '@navikt/aksel-icons';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';
import { Trans } from 'react-i18next';
import { altinnDocsUrl } from "app-shared/ext-urls";

export const ConditionalRendering = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const t = useText();
  return (
    <div className={classes.conditionalRendering}>
        <div>
          <div className={classes.dynamicsVersionCheckBox}>
            <Alert severity='warning'>
              <Trans i18nKey={'right_menu.warning_dynamics_deprecated'}>
                <a
                    href={altinnDocsUrl('altinn-studio/designer/build-app/expressions')}
                    target='_newTab'
                    rel='noopener noreferrer'
                />
              </Trans>
            </Alert>
            <Divider/>
          </div>
          <div className={classes.header}>
            <span>{t('right_menu.rules_conditional_rendering')}</span>
            <Button
              aria-label={t('right_menu.rules_conditional_rendering_add_alt')}
              className={classes.addIcon}
              icon={<PlusIcon />}
              onClick={() => setModalOpen(true)}
              variant='quiet'
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
