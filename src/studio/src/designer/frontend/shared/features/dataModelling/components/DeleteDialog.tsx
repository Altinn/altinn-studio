import { Button, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import * as React from 'react';
import { getLanguageFromKey, getParsedLanguageFromKey } from '../../../utils/language';
import altinnTheme from '../../../theme/altinnStudioTheme';

interface IDeleteDialogProps {
  anchor: Element,
  language: any,
  schemaName: string,
  onConfirm: () => void,
  onCancel: () => void,
}

const useStyles = makeStyles({
  root: {
    padding: 20,
    maxWidth: 470,
    '& button': {
      margin: 8,
    },
  },
  borderBottom: {
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.blueDark}`,
  },
  deleteButton: {
    backgroundColor: '#dc044c',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#9a0036',
    },
  },
  iconWrapper: {
    color: '#dc044c',
    fontSize: '1.5em',
  },
  icon: {
    margin: 4,
  },
});

export default function DeleteDialog(props: IDeleteDialogProps) {
  const description = getParsedLanguageFromKey(
    'administration.delete_model_confirm', props.language, [props.schemaName], true,
  );
  const classes = useStyles();
  return (
    <Popover
      open={!!props.anchor}
      onClose={props.onCancel}
      anchorEl={props.anchor}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <Grid
        container={true}
        className={classes.root}
      >
        <Grid item>
          <div className={classes.iconWrapper}>
            <i className='icon fa fa-circle-exclamation'/>
          </div>
        </Grid>

        <Grid item>
          <Typography variant='h2'>
            {description}
          </Typography>

          <Button
            id='confirm-delete-button'
            className={classes.deleteButton}
            variant='contained'
            onClick={props.onConfirm}
          >
            {getLanguageFromKey('general.continue', props.language)}
          </Button>

          <Button
            id='cancel-delete-button'
            color='primary'
            onClick={props.onCancel}
          >
            <span className={classes.borderBottom}>
              {getLanguageFromKey('general.cancel', props.language)}
            </span>
          </Button>
        </Grid>
      </Grid>
    </Popover>);
}
