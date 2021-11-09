import { Grid, makeStyles, Typography } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { IRuntimeState } from 'src/types';
import { IAttachment } from 'src/shared/resources/attachments';
import { EditButton } from './EditButton';

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
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
});

export function AttachmentSummaryComponent(props: IAttachmentSummaryComponent) {
  const classes = useStyles();
  const attachments: IAttachment[] = useSelector(
    (state: IRuntimeState) => state.attachments.attachments[props.componentRef],
  );

  return (
    <>
      <Grid item={true} xs={10}>
        <Typography
          variant='body1'
          className={`${classes.label}${
            props.hasValidationMessages ? ` ${classes.labelWithError}` : ''
          }`}
          component='span'
        >
          {props.label}
        </Typography>
      </Grid>
      <Grid item xs={2}>
        <EditButton onClick={props.onChangeClick} editText={props.changeText} />
      </Grid>
      <Grid item xs={12}>
        {attachments &&
          attachments.map((attachment) => {
            return (
              // eslint-disable-next-line react/jsx-key
              <Typography variant='body1'>{attachment.name}</Typography>
            );
          })}
      </Grid>
    </>
  );
}
