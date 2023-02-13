import * as React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { IAttachment } from 'src/shared/resources/attachments';

export interface IAttachmentSummaryComponent {
  componentRef: string;
}

const useStyles = makeStyles({
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
  },
});

export function AttachmentSummaryComponent({ componentRef }: IAttachmentSummaryComponent) {
  const classes = useStyles();
  const attachments: IAttachment[] | undefined = useAppSelector((state) => state.attachments.attachments[componentRef]);
  const language = useAppSelector((state) => state.language.language);
  const isEmpty = !attachments || attachments.length < 1;
  return (
    <Grid
      item
      xs={12}
      data-testid={'attachment-summary-component'}
    >
      {isEmpty ? (
        <Typography
          variant='body1'
          className={classes.emptyField}
          component='p'
        >
          {getLanguageFromKey('general.empty_summary', language || {})}
        </Typography>
      ) : (
        attachments.map((attachment) => {
          return (
            <Typography
              key={attachment.id}
              variant='body1'
            >
              {attachment.name}
            </Typography>
          );
        })
      )}
    </Grid>
  );
}
