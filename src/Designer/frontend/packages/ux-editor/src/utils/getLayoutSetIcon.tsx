import React, { type ReactElement } from 'react';
import {
  CardIcon,
  ClipboardIcon,
  DataTaskIcon,
  QuestionmarkIcon,
  ReceiptIcon,
  SignTaskIcon,
  UserControlledSigningIcon,
} from 'libs/studio-icons/src';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import type { BpmnTaskType } from 'app-shared/types/BpmnTaskType';
import type { StudioIconCardIconColors } from '@studio/components-legacy';

type IconMetaData = {
  icon: ReactElement;
  iconColor: StudioIconCardIconColors;
};

export const getLayoutSetIcon = (layoutSetModel: LayoutSetModel): IconMetaData => {
  const { type, task } = layoutSetModel;
  return (
    iconByLayoutSetModelType[type] ||
    iconByTaskIdMap[task?.id] ||
    iconByTaskTypeMap[task?.type] ||
    defaultIcon
  );
};

const iconByTaskTypeMap: Partial<Record<BpmnTaskType, IconMetaData>> = {
  data: { icon: <DataTaskIcon />, iconColor: 'blue' },
  signing: { icon: <SignTaskIcon />, iconColor: 'red' },
  payment: { icon: <CardIcon />, iconColor: 'yellow' },
  userControlledSigning: { icon: <UserControlledSigningIcon />, iconColor: 'green' },
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
