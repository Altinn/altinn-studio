import { Grid, makeStyles, Typography } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { IRuntimeState } from 'src/types';
import { IAttachment } from 'src/shared/resources/attachments';

export interface IAttachmentSummaryComponent {
  componentRef: string;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    fontSize: '1.8rem',
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
  },
  editIcon: {
    paddingLeft: '6px',
    fontSize: '1.8rem !important',
  },
  change: {
    fontSize: '1.8rem',
    cursor: 'pointer',
  },
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
});

export function AttachmentSummaryComponent(props: IAttachmentSummaryComponent) {
  const classes = useStyles();
  const attachments: IAttachment[] =
    useSelector((state: IRuntimeState) => state.attachments.attachments[props.componentRef]);

  return (
    <>
      <Grid item={true} xs={10}>
        <Typography
          variant='body1'
          className={`${classes.label}${props.hasValidationMessages ? ` ${classes.labelWithError}` : ''}`}
          component='span'
        >
          {props.label}
        </Typography>
      </Grid>
      <Grid item xs={2}>
        <Typography
          variant='body1'
          onClick={props.onChangeClick}
          className={classes.change}
        >
          <span>{props.changeText}</span>
          <i className={`fa fa-editing-file ${classes.editIcon}`} />
        </Typography>
      </Grid>
      <Grid item xs={12}>
        {attachments && attachments.map((attachment) => {
          return (
            <Typography variant='body1'>{attachment.name}</Typography>
          );
        })}
      </Grid>
    </>
  );
}
