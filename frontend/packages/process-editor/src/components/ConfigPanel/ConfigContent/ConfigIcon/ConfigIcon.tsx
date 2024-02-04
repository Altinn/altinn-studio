import React from 'react';
import classes from './ConfigIcon.module.css';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';
import { ConfirmationTask, DataTask, FeedbackTask, SignTask } from '@studio/icons';

export type ConfigIconProps = {
  taskType: BpmnTaskType;
};

export const ConfigIcon = ({ taskType }: ConfigIconProps): JSX.Element => {
  switch (taskType) {
    case 'data':
      return <DataTask className={classes.icon} />;
    case 'confirmation':
      return <ConfirmationTask className={classes.icon} />;
    case 'feedback':
      return <FeedbackTask className={classes.icon} />;
    case 'signing':
      return <SignTask className={classes.icon} />;
  }
};
