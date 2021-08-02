import { Button, createTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import AltinnIcon from '../components/AltinnIcon';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';

export interface IFetchChangesComponentProps {
  changesInMaster: boolean;
  classes: any;
  fetchChanges: any;
  language: any;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  bold: {
    fontWeight: 500,
  },
  btn: {
    'textTransform': 'none',
    'padding': 0,
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
  clickable: {
    maxWidth: '250px',
  },
  color_blueDark: {
    color: theme.altinnPalette.primary.blueDark,
  },
});

class FetchChangesComponent extends React.Component<IFetchChangesComponentProps> {

  public fetchChangesHandler = (event: any) => {
    this.props.fetchChanges(event.currentTarget);
  }

  public render() {
    const { classes } = this.props;
    return (
      <Button
        onClick={this.fetchChangesHandler}
        className={classNames(classes.clickable, classes.btn)}
      >
        <Grid container={true} alignItems='center'>
          <Grid item={true}>
            <AltinnIcon
              iconClass='fa fa-download'
              iconColor={theme.altinnPalette.primary.blueDark}
              iconSize={36}
              margin='0px -5px 0px -5px'
              weight={this.props.changesInMaster ? 600 : null}
            />
          </Grid>
          <Grid item={true}>
            <Typography
              id='fetch_changes_btn'
              variant='body1'
              className={classNames(classes.color_blueDark,
                { [classes.bold]: this.props.changesInMaster === true },
              )}
            >
              {getLanguageFromKey('sync_header.fetch_changes', this.props.language)}
            </Typography>
          </Grid>
        </Grid>
      </Button>
    );
  }
}

export default withStyles(styles)(FetchChangesComponent);
