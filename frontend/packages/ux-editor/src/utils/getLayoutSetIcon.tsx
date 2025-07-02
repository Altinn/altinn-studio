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
import type { BpmnTaskType } from 'app-shared/types/BpmnTaskType';
import type { StudioIconCardIconColors } from '@studio/components-legacy';

type IconMetaData = {
  icon: ReactElement;
  iconColor: StudioIconCardIconColors;
};

export const getLayoutSetIcon = (layoutSetModel: LayoutSetModel): IconMetaData => {
  return (
    iconByLayoutSetModelType[layoutSetModel.type] ||
    iconByTaskIdMap[layoutSetModel.task?.id] ||
    iconByTaskTypeMap[layoutSetModel.task?.type] ||
    defaultIcon
  );
};

const iconByTaskTypeMap: Partial<Record<BpmnTaskType, IconMetaData>> = {
  data: { icon: <DataTaskIcon />, iconColor: 'blue' },
  signing: { icon: <SignTaskIcon />, iconColor: 'red' },
  payment: { icon: <CardIcon />, iconColor: 'yellow' },
};

const iconByTaskIdMap: Record<string, IconMetaData> = {
  CustomReceipt: { icon: <ReceiptIcon />, iconColor: 'green' },
};

const iconByLayoutSetModelType: Record<string, IconMetaData> = {
  subform: { icon: <ClipboardIcon />, iconColor: 'blue' },
};

const defaultIcon: IconMetaData = {
  icon: <QuestionmarkIcon />,
  iconColor: 'grey',
};
