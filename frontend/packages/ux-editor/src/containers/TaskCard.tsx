import React, { type ReactElement } from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import {
  StudioIconCard,
  type StudioIconCardIconColors,
} from '@studio/components/src/components/StudioIconCard/StudioIconCard';
import {
  ClipboardIcon,
  DataTaskIcon,
  QuestionmarkIcon,
  ReceiptIcon,
  SignTaskIcon,
} from '@studio/icons';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();

  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = ((): { icon: ReactElement; iconColor: StudioIconCardIconColors } => {
    if (layoutSetModel.type == 'subform') return { icon: <ClipboardIcon />, iconColor: 'blue' };
    if (layoutSetModel.task?.id == 'CustomReceipt')
      return { icon: <ReceiptIcon />, iconColor: 'green' };
    if (layoutSetModel.task?.type == 'data') return { icon: <DataTaskIcon />, iconColor: 'blue' };
    if (layoutSetModel.task?.type == 'signing') return { icon: <SignTaskIcon />, iconColor: 'red' };
    return { icon: <QuestionmarkIcon />, iconColor: 'grey' };
  })();

  console.log(layoutSetModel);

  return (
    <StudioIconCard
      icon={taskIcon.icon}
      iconColor={taskIcon.iconColor}
      header={t(taskName)}
      description={layoutSetModel.id}
      // linkHref="wow"
    />
  );
};
