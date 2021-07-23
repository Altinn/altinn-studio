import { Button, createTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import AltinnIcon from '../components/AltinnIcon';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';

export interface IShareChangesComponentProps {
  buttonOnly?: boolean;
  changesInLocalRepo: boolean;
  classes: any;
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  language: any;
  moreThanAnHourSinceLastPush: boolean;
  shareChanges: any;
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
  checkIconPositionFix: {
    position: 'relative',
    top: '-4px',
  },
  clickable: {
    [theme.breakpoints.down('md')]: {
      float: 'right',
      marginRight: '10px',
    },
  },
  color_blueDark: {
    color: theme.altinnPalette.primary.blueDark,
  },
});

class ShareChangesComponent extends React.Component<IShareChangesComponentProps> {
  public shareChangesHandler = (event: any) => {
    const noChanges = !this.props.changesInLocalRepo;
    this.props.shareChanges(event.currentTarget, noChanges);
  }

  public renderCorrectText() {
    const { classes, hasMergeConflict } = this.props;

    if (hasMergeConflict) {
      return (
        <Grid container={true} alignItems='center'>
          <Grid item={true}>
            <AltinnIcon
              iconClass='fa fa-circlecancel'
              iconColor={theme.altinnPalette.primary.blueDark}
              margin='0px 5px 0px 0px'
              weight={600}
            />
          </Grid>
          <Grid item={true}>
            <Typography
              variant='body1'
              className={classNames(classes.color_blueDark, classes.bold)}
            >
              {getLanguageFromKey('sync_header.merge_conflict', this.props.language)}
            </Typography>
          </Grid>
        </Grid>

      );
    } else if (this.props.changesInLocalRepo) {
      return (
        <Grid container={true} alignItems='center'>
          <Grid item={true}>
            {this.props.hasPushRight &&
              <AltinnIcon
                iconClass='fa fa-upload'
                iconColor={theme.altinnPalette.primary.blueDark}
                iconSize={36}
                margin='0px -5px 0px -5px'
                weight={600}
              />
            }
          </Grid>
          <Grid item={true}>
            <Typography
              id='changes_to_share_btn'
              variant='body1'
              className={classNames(classes.color_blueDark, classes.bold)}
            >
              {getLanguageFromKey('sync_header.changes_to_share', this.props.language)}
            </Typography>
          </Grid>
        </Grid>
      );
    } else {
      return (
        <Grid container={true} alignItems='center'>
          <Grid item={true}>
            <AltinnIcon
              iconClass='fa fa-upload'
              iconColor={theme.altinnPalette.primary.blueDark}
              iconSize={36}
              margin='0px -5px 0px -5px'
            />
          </Grid>
          <Grid item={true}>
            <Typography
              id='no_changes_to_share_btn'
              variant='body1'
              className={classNames(classes.color_blueDark)}
            >
              {getLanguageFromKey('sync_header.no_changes_to_share', this.props.language)}
            </Typography>
          </Grid>
        </Grid>
      );
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <Button
        onClick={this.shareChangesHandler}
        id='share_changes_button'
        className={classNames(classes.color_blueDark, classes.btn,
          { [classes.clickable]: this.props.buttonOnly !== true },
        )}
      >
        {this.renderCorrectText()}
      </Button>
    );
  }
}

export default withStyles(styles)(ShareChangesComponent);
