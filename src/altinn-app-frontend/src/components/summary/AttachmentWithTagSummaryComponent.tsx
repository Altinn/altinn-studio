import * as React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { getOptionLookupKey } from 'src/utils/options';
import type { ILayoutCompFileUploadWithTag } from 'src/features/form/layout';
import type { IAttachment } from 'src/shared/resources/attachments';

export interface IAttachmentWithTagSummaryComponent {
  componentRef: string;
  component: ILayoutCompFileUploadWithTag;
}

const useStyles = makeStyles({
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px dashed #008FD6',
    marginTop: 10,
    paddingTop: 10,
  },
});

export function AttachmentWithTagSummaryComponent(
  props: IAttachmentWithTagSummaryComponent,
) {
  const classes = useStyles();
  const attachments: IAttachment[] = useAppSelector(
    (state) => state.attachments.attachments[props.componentRef],
  );
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const options = useAppSelector(
    (state) =>
      state.optionState.options[
        getOptionLookupKey(props.component.optionsId, props.component.mapping)
      ]?.options,
  );

  const getOptionsTagLabel = ({ tags }: { tags: string[] }) => {
    return options?.find((option) => option.value === tags[0])?.label;
  };
  const tryToGetTextResource = (attachment) => {
    const optionsTagLabel = getOptionsTagLabel(attachment);
    return (
      textResources?.find(({ id }) => id === optionsTagLabel)?.value ||
      optionsTagLabel
    );
  };
  return (
    <Grid
      item
      xs={12}
      data-testid={'attachment-with-tag-summary'}
    >
      {attachments?.map((attachment) => (
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
            {attachment.tags[0] && tryToGetTextResource(attachment)}
          </Typography>
        </Grid>
      ))}
    </Grid>
  );
}
