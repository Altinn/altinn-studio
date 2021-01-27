import * as React from 'react';
import { AltinnAttachment } from 'altinn-shared/components';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import { IAttachment } from 'altinn-shared/types';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import { Grid, Typography } from '@material-ui/core';

export interface IAttachmentListProps {
  id: string;
  text: string;
  dataTypeIds?: string[];
}

export function AttachmentListComponent(props: IAttachmentListProps) {
  const currentTaskId = useSelector(
    (state: IRuntimeState) => state.instanceData.instance.process.currentTask.elementId,
  );
  const dataForTask = useSelector((state: IRuntimeState) => {
    const dataTypes = state.applicationMetadata.applicationMetadata.dataTypes.filter((type) => {
      return type.taskId === state.instanceData.instance.process.currentTask.elementId;
    });
    return state.instanceData.instance.data.filter((dataElement) => {
      if (props.dataTypeIds) {
        return props.dataTypeIds.findIndex((id) => dataElement.dataType === id) > -1;
      }
      return dataTypes.findIndex((type) => dataElement.dataType === type.id) > -1;
    });
  });
  const attachments: IAttachment[] = useSelector((state: IRuntimeState) => {
    const appLogicDataTypes = state.applicationMetadata.applicationMetadata.dataTypes.filter((dataType) => {
      return dataType.appLogic && dataType.taskId === currentTaskId;
    });
    return mapInstanceAttachments(dataForTask, appLogicDataTypes.map((type) => type.id));
  });

  return (
    <Grid item={true} xs={12}>
      <Typography className='attachmentList-title' component='span'>
        {props.text || ''}
      </Typography>
      <AltinnAttachment
        attachments={attachments}
      />
    </Grid>
  );
}
