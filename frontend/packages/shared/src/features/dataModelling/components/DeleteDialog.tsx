import React from 'react';
import { Button, Grid, Popover, Typography } from '@mui/material';
import { getLanguageFromKey, getParsedLanguageFromKey } from '../../../utils/language';
import classes from './DeleteDialog.module.css';

export interface IDeleteDialogProps {
  anchor: Element;
  language: any;
  schemaName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog(props: IDeleteDialogProps) {
  const description = getParsedLanguageFromKey(
    'administration.delete_model_confirm',
    props.language,
    [props.schemaName],
    true
  );
  return (
    <Popover
      open={!!props.anchor}
      onClose={props.onCancel}
      anchorEl={props.anchor}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <Grid container={true} className={classes.root}>
        <Grid item>
          <div className={classes.iconWrapper}>
            <i className='icon fa fa-circle-exclamation' />
          </div>
        </Grid>

        <Grid item>
          <Typography variant='h2'>{description}</Typography>

          <Button
            id='confirm-delete-button'
            className={classes.deleteButton}
            variant='contained'
            onClick={props.onConfirm}
          >
            {getLanguageFromKey('general.continue', props.language)}
          </Button>

          <Button id='cancel-delete-button' color='primary' onClick={props.onCancel}>
            <span className={classes.borderBottom}>
              {getLanguageFromKey('general.cancel', props.language)}
            </span>
          </Button>
        </Grid>
      </Grid>
    </Popover>
  );
}
