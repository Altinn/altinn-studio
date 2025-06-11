import React from 'react';
import classes from './Calculations.module.css';
import { RuleModal } from '../toolbar/RuleModal';
import { OldDynamicsInfo } from './OldDynamicsInfo';

export const Calculations = () => {
  return (
    <div className={classes.calculations}>
      <div className={classes.ruleModalWrapper}>
        <RuleModal />
      </div>
      <OldDynamicsInfo />
    </div>
  );
};
