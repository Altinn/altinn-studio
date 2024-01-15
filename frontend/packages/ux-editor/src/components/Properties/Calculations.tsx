import React from 'react';
import classes from './Calculations.module.css';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { RuleModal } from '../toolbar/RuleModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { Divider } from 'app-shared/primitives';
import { useText } from '../../hooks';
import { useFormContext } from '../../containers/FormContext';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';

export const Calculations = () => {
  const { form } = useFormContext();

  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const t = useText();

  const isUnknownInternalComponent: boolean = !formItemConfigs[form?.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={form?.type} />;
  }

  return (
    <div className={classes.calculations}>
      <div>
        <div className={classes.header}>
          <span>{t('right_menu.rules_calculations')}</span>
          <Button
            aria-label={t('right_menu.rules_calculations_add_alt')}
            icon={<PlusIcon />}
            onClick={() => setModalOpen(true)}
            variant='tertiary'
            size='small'
          />
        </div>
        <RuleModal
          modalOpen={modalOpen}
          handleClose={() => setModalOpen(false)}
          handleOpen={() => setModalOpen(true)}
        />
      </div>
      <Divider marginless />
      <OldDynamicsInfo />
    </div>
  );
};
