import { Grid, makeStyles, Typography } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { IRuntimeState } from 'src/types';
import { IAttachment } from 'src/shared/resources/attachments';
import { ILayoutComponent, ISelectionComponentProps } from 'src/features/form/layout';
import { EditButton } from './EditButton';

export interface IAttachmentWithTagSummaryComponent {
  componentRef: string;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  component: ILayoutComponent
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
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px dashed #008FD6',
    marginTop: 10,
    paddingTop: 10,
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
});

export function AttachmentWithTagSummaryComponent(props: IAttachmentWithTagSummaryComponent) {
  const classes = useStyles();
  const attachments: IAttachment[] =
    useSelector((state: IRuntimeState) => state.attachments.attachments[props.componentRef]);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const selectionComponent = props.component as ISelectionComponentProps;
  const options = useSelector((state: IRuntimeState) => state.optionState.options[selectionComponent.optionsId]);

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
        <EditButton
          onClick={props.onChangeClick}
          editText={props.changeText}
        />
      </Grid>
      <Grid item xs={12}>
        {attachments && attachments?.map((attachment) => {
          return (
            <Grid
              container={true}
              className={classes.row}
              key={`attachment-summary-${attachment.id}`}
            >
              <Typography key={`attachment-summary-name-${attachment.id}`} variant='body1'>
                {attachment.name}
              </Typography>
              <Typography key={`attachment-summary-tag-${attachment.id}`} variant='body1'>
                {attachment.tags[0] &&
                  (
                    textResources?.find(
                      (resource) => resource.id === (options?.find(
                        (option) => option.value === attachment.tags[0],
                      )?.label),
                    )?.value ||
                      options?.find(
                        (option) => option.value === attachment.tags[0],
                      )?.label
                  )
                }
              </Typography>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
