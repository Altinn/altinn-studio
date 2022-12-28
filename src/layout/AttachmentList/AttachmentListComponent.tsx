import * as React from 'react';

import { Grid, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { AltinnAttachment } from 'src/components/shared';
import { getInstancePdf, mapInstanceAttachments } from 'src/utils/sharedUtils';
import type { PropsFromGenericComponent } from 'src/layout';

export type IAttachmentListProps = PropsFromGenericComponent<'AttachmentList'>;

export function AttachmentListComponent(props: IAttachmentListProps) {
  const currentTaskId = useAppSelector((state) => state.instanceData.instance?.process.currentTask?.elementId);
  const dataForTask = useAppSelector((state) => {
    const dataTypes = state.applicationMetadata.applicationMetadata?.dataTypes.filter((type) => {
      return type.taskId === state.instanceData.instance?.process.currentTask?.elementId;
    });
    return state.instanceData.instance?.data.filter((dataElement) => {
      if (props.dataTypeIds) {
        return props.dataTypeIds.findIndex((id) => dataElement.dataType === id) > -1;
      }
      return dataTypes && dataTypes.findIndex((type) => dataElement.dataType === type.id) > -1;
    });
  });
  const includePDF = props.includePDF;
  const attachments = useAppSelector((state) => {
    const appLogicDataTypes = state.applicationMetadata.applicationMetadata?.dataTypes.filter((dataType) => {
      return dataType.appLogic && dataType.taskId === currentTaskId;
    });
    return includePDF
      ? getInstancePdf(dataForTask)
      : mapInstanceAttachments(dataForTask, appLogicDataTypes?.map((type) => type.id) || []);
  });

  return (
    <Grid
      item={true}
      xs={12}
    >
      <Typography
        className='attachmentList-title'
        component='span'
      >
        {props.text || ''}
      </Typography>
      <AltinnAttachment attachments={attachments} />
    </Grid>
  );
}
