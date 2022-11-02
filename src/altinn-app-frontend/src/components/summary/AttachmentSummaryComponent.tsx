import * as React from 'react';

import { Grid, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import type { IAttachment } from 'src/shared/resources/attachments';

export interface IAttachmentSummaryComponent {
  componentRef: string;
}

export function AttachmentSummaryComponent({
  componentRef,
}: IAttachmentSummaryComponent) {
  const attachments: IAttachment[] | undefined = useAppSelector(
    (state) => state.attachments.attachments[componentRef],
  );
  return (
    <Grid
      item
      xs={12}
      data-testid={'attachment-summary-component'}
    >
      {attachments &&
        attachments.map((attachment) => {
          return (
            <Typography
              key={attachment.id}
              variant='body1'
            >
              {attachment.name}
            </Typography>
          );
        })}
    </Grid>
  );
}
