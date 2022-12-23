import React from 'react';
import classes from './CalculationsTab.module.css';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import { Add } from '@navikt/ds-icons';
import { RuleModal } from '../toolbar/RuleModal';
import { LogicMode } from '../../types/global';
import { Dynamics } from './Dynamics';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';

interface CalculationsTabProps {
  toggleFileEditor: (mode?: LogicMode) => void;
}

export const CalculationsTab = ({ toggleFileEditor }: CalculationsTabProps) => {
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const t = useText();
  return <div className={classes.calculations}>
    <div>
      <div className={classes.header}>
        <span>{t('right_menu.rules_calculations')}</span>
        <Button
          aria-label={t('right_menu.rules_calculations_add_alt')}
          icon={<Add />}
          onClick={() => setModalOpen(true)}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <RuleModal modalOpen={modalOpen} handleClose={() => setModalOpen(false)} />
    </div>
    <Divider inMenu />
    <Dynamics toggleFileEditor={toggleFileEditor} />
  </div>;
};
