import React from 'react';
import classes from './Calculations.module.css';
import { RuleModal } from '../toolbar/RuleModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import { useFormItemContext } from '../../containers/FormItemContext';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';

export const Calculations = () => {
  const { formItem: form } = useFormItemContext();

  const isUnknownInternalComponent: boolean = form && !formItemConfigs[form.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={form.type} />;
  }

  return (
    <div className={classes.calculations}>
      <div className={classes.ruleModalWrapper}>
        <RuleModal />
      </div>
      <OldDynamicsInfo />
    </div>
  );
};
