import React from 'react';
import classes from './ConfigIcon.module.css';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';
import {
  ArchiveIcon,
  ArrowRightIcon,
  BranchingIcon,
  CogIcon,
  ConfirmationTaskIcon,
  DataTaskIcon,
  EFormidlingIcon,
  FeedbackTaskIcon,
  EndEventIcon,
  PaymentTaskIcon,
  PdfTaskIcon,
  SignTaskIcon,
  SubformPdfIcon,
} from '@studio/icons';
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
    case 'pdf':
      return <PdfTaskIcon className={classes.icon} />;
    case 'eFormidling':
      return <EFormidlingIcon className={classes.icon} />;
    case 'subformPdf':
      return <SubformPdfIcon className={classes.icon} />;
    case 'fiksArkiv':
      return <ArchiveIcon className={classes.icon} />;
    case BpmnTypeEnum.EndEvent.toString():
      return <EndEventIcon className={classes.icon} />;
    case BpmnTypeEnum.SequenceFlow.toString():
      return <ArrowRightIcon className={classes.icon} />;
    case BpmnTypeEnum.ExclusiveGateway.toString():
      return <BranchingIcon className={classes.icon} />;
  }

  // Any other task type is a service task the app implements itself.
  return typeof taskType === 'string' ? <CogIcon className={classes.icon} /> : null;
};
