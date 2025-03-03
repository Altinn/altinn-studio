import React, { type ReactElement } from 'react';
import {
  CardIcon,
  ClipboardIcon,
  DataTaskIcon,
  QuestionmarkIcon,
  ReceiptIcon,
  SignTaskIcon,
} from '@studio/icons';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import type { StudioIconCardIconColors } from '@studio/components/src/components/StudioIconCard/StudioIconCard';

export const useLayoutSetIcon = (
  layoutSetModel: LayoutSetModel,
): { icon: ReactElement; iconColor: StudioIconCardIconColors } => {
  if (layoutSetModel.type == 'subform') return { icon: <ClipboardIcon />, iconColor: 'blue' };

  if (layoutSetModel.task?.id == 'CustomReceipt')
    return { icon: <ReceiptIcon />, iconColor: 'green' };
  if (layoutSetModel.task?.type == 'data') return { icon: <DataTaskIcon />, iconColor: 'blue' };
  if (layoutSetModel.task?.type == 'signing') return { icon: <SignTaskIcon />, iconColor: 'red' };
  if (layoutSetModel.task?.type == 'payment') return { icon: <CardIcon />, iconColor: 'yellow' };

  return { icon: <QuestionmarkIcon />, iconColor: 'grey' };
};
