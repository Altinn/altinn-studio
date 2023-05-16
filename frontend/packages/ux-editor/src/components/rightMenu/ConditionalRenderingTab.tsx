import React, { useState } from 'react';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import classes from './ConditionalRenderingTab.module.css';
import { PlusIcon } from '@navikt/aksel-icons';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { Dynamics } from './Dynamics';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';

export const ConditionalRenderingTab = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const t = useText();
  return (
    <div className={classes.conditionalRendering}>
      <div>
        <div className={classes.header}>
          <span>{t('right_menu.rules_conditional_rendering')}</span>
          <Button
            aria-label={t('right_menu.rules_conditional_rendering_add_alt')}
            className={classes.addIcon}
            icon={<PlusIcon />}
            onClick={() => setModalOpen(true)}
            variant={ButtonVariant.Quiet}
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
      <Divider marginless/>
      <Dynamics />
    </div>
  );
};
