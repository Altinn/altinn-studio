import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { useUploaderSummaryData } from 'src/layout/FileUpload/shared/summary';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IAttachmentSummaryComponent {
  targetNode: LayoutNodeFromType<'FileUpload'>;
}

const useStyles = makeStyles({
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
    lineHeight: 1.6875,
  },
});

export function AttachmentSummaryComponent({ targetNode }: IAttachmentSummaryComponent) {
  const classes = useStyles();
  const attachments = useUploaderSummaryData(targetNode);
  const language = useAppSelector((state) => state.language.language);
  return (
    <Grid
      item
      xs={12}
      data-testid={'attachment-summary-component'}
    >
      {attachments.length === 0 ? (
        <Typography
          variant='body1'
          className={classes.emptyField}
          component='p'
        >
          {getLanguageFromKey('general.empty_summary', language || {})}
        </Typography>
      ) : (
        attachments.map((attachment) => (
          <Typography
            key={attachment.id}
            variant='body1'
          >
            {attachment.name}
          </Typography>
        ))
      )}
    </Grid>
  );
}
