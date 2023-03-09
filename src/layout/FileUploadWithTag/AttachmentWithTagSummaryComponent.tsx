import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { useUploaderSummaryData } from 'src/layout/FileUpload/shared/summary';
import { getOptionLookupKey } from 'src/utils/options';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IAttachmentWithTagSummaryComponent {
  targetNode: LayoutNodeFromType<'FileUploadWithTag'>;
}

const useStyles = makeStyles({
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px dashed #008FD6',
    marginTop: 10,
    paddingTop: 10,
  },
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
    lineHeight: 1.6875,
  },
});

export function AttachmentWithTagSummaryComponent({ targetNode }: IAttachmentWithTagSummaryComponent) {
  const classes = useStyles();
  const component = targetNode.item;
  const attachments = useUploaderSummaryData(targetNode);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);
  const options = useAppSelector(
    (state) =>
      state.optionState.options[
        getOptionLookupKey({
          id: component.optionsId,
          mapping: component.mapping,
        })
      ]?.options,
  );

  const getOptionsTagLabel = ({ tags }: { tags: string[] }) => {
    return options?.find((option) => option.value === tags[0])?.label;
  };
  const tryToGetTextResource = (attachment) => {
    const optionsTagLabel = getOptionsTagLabel(attachment);
    return textResources?.find(({ id }) => id === optionsTagLabel)?.value || optionsTagLabel;
  };
  return (
    <Grid
      item
      xs={12}
      data-testid={'attachment-with-tag-summary'}
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
          <Grid
            container={true}
            className={classes.row}
            key={`attachment-summary-${attachment.id}`}
          >
            <Typography
              key={`attachment-summary-name-${attachment.id}`}
              variant='body1'
            >
              {attachment.name}
            </Typography>
            <Typography
              key={`attachment-summary-tag-${attachment.id}`}
              variant='body1'
            >
              {attachment.tags && attachment.tags[0] && tryToGetTextResource(attachment)}
            </Typography>
          </Grid>
        ))
      )}
    </Grid>
  );
}
