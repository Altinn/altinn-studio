import React from 'react';
import { BpmnTaskType } from '../../../types/BpmnTaskType';
import { ConfirmationTask, DataTask, FeedbackTask, SignTask } from '@studio/icons';

export type ConfigIconProps = {
  taskType: BpmnTaskType;
};

export const ConfigIcon = ({ taskType }: ConfigIconProps): JSX.Element => {
  switch (taskType) {
    case 'data':
      return <DataTask />;
    case 'confirmation':
      return <ConfirmationTask />;
    case 'feedback':
      return <FeedbackTask />;
    case 'signing':
      return <SignTask />;
  }
};
