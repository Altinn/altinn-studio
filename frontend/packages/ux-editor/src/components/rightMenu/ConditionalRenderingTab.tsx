import React, { useState } from 'react';
import { Button, ButtonVariant, Checkbox } from '@digdir/design-system-react';
import classes from './ConditionalRenderingTab.module.css';
import { PlusIcon } from '@navikt/aksel-icons';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';

type ConditionalRenderingTabProps = {
  onShowNewDynamicsTab: (value: boolean) => void;
  showNewDynamicsTab: boolean;
};

export const ConditionalRenderingTab = ({ onShowNewDynamicsTab, showNewDynamicsTab }: ConditionalRenderingTabProps) => {
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
      <OldDynamicsInfo />
      { !_useIsProdHack() &&
        <Checkbox
          label={t('right_menu.show_new_dynamics')}
          name={'checkbox-name'}
          checked={showNewDynamicsTab}
          onChange={() => onShowNewDynamicsTab(!showNewDynamicsTab)}/>
      }
    </div>
  );
};
