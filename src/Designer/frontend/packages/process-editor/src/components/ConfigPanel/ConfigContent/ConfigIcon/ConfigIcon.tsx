import React from 'react';
import classes from './ConfigIcon.module.css';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';
import {
  ArrowRightIcon,
  ConfirmationTaskIcon,
  DataTaskIcon,
  FeedbackTaskIcon,
  EndEventIcon,
  PaymentTaskIcon,
  SignTaskIcon,
} from 'libs/studio-icons/src';
import { BpmnTypeEnum } from '@altinn/process-editor/enum/BpmnTypeEnum';

export type ConfigIconProps = {
  taskType?: BpmnTaskType;
  type?: BpmnTypeEnum;
};

export const ConfigIcon = ({ taskType, type }: ConfigIconProps): React.ReactElement => {
  const iconDecider = taskType ?? type;
  switch (iconDecider) {
    case 'data':
      return <DataTaskIcon className={classes.icon} />;
    case 'confirmation':
      return <ConfirmationTaskIcon className={classes.icon} />;
    case 'feedback':
      return <FeedbackTaskIcon className={classes.icon} />;
    case 'signing':
      return <SignTaskIcon className={classes.icon} />;
    case 'payment':
      return <PaymentTaskIcon className={classes.icon} />;
    case BpmnTypeEnum.EndEvent.toString():
      return <EndEventIcon className={classes.icon} />;
    case BpmnTypeEnum.SequenceFlow.toString():
      return <ArrowRightIcon className={classes.icon} />;
  }
};
