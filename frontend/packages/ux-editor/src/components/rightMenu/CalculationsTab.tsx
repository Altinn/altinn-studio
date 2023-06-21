import React from 'react';
import classes from './CalculationsTab.module.css';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { RuleModal } from '../toolbar/RuleModal';
import { Dynamics } from './Dynamics';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';

export const CalculationsTab = () => {
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const t = useText();
  return <div className={classes.calculations}>
    <div>
      <div className={classes.header}>
        <span>{t('right_menu.rules_calculations')}</span>
        <Button
          aria-label={t('right_menu.rules_calculations_add_alt')}
          icon={<PlusIcon />}
          onClick={() => setModalOpen(true)}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <RuleModal
        modalOpen={modalOpen}
        handleClose={() => setModalOpen(false)}
        handleOpen={() => setModalOpen(true)} />
    </div>
    <Divider marginless/>
    <Dynamics />
  </div>;
};
