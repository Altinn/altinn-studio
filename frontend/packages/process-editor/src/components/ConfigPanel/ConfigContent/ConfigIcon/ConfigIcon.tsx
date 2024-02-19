import React from 'react';
import classes from './ConfigIcon.module.css';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';
import { ConfirmationTaskIcon, DataTaskIcon, FeedbackTaskIcon, SignTaskIcon } from '@studio/icons';

export type ConfigIconProps = {
  taskType: BpmnTaskType;
};

export const ConfigIcon = ({ taskType }: ConfigIconProps): JSX.Element => {
  switch (taskType) {
    case 'data':
      return <DataTaskIcon className={classes.icon} />;
    case 'confirmation':
      return <ConfirmationTaskIcon className={classes.icon} />;
    case 'feedback':
      return <FeedbackTaskIcon className={classes.icon} />;
    case 'signing':
      return <SignTaskIcon className={classes.icon} />;
  }
};
