import { Button, createMuiTheme, createStyles, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';

export interface IShareChangesCompoenentProvidedProps {
  classes: any;
  shareChanges: any;
  changesInLocalRepo: boolean;
  moreThanAnHourSinceLastPush: boolean;
  hasPushRight: boolean;
  hasMergeConflict: boolean;
  language: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  color_blueDarker: {
    color: theme.altinnPalette.primary.blueDarker,
  },
  color_blueDark: {
    color: theme.altinnPalette.primary.blueDark,
  },
  bold: {
    fontWeight: 500,
  },
  fontSize_16: {
    fontSize: '16px !Important',
  },
  marginRight_10: {
    marginRight: '10px',
  },
  clickable: {
    [theme.breakpoints.down('md')]: {
      float: 'right',
      marginRight: '10px',
    },
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
});

class ShareChangesCompoenent extends React.Component<IShareChangesCompoenentProvidedProps, any> {
  public shareChangesHandler = (event: any) => {
    if (this.props.changesInLocalRepo) {
      this.props.shareChanges(event.currentTarget);
    }
  }

  public renderCorrectText() {
    const { classes } = this.props;
    if (this.props.hasMergeConflict) {
      return (
        <p
          className={classNames(classes.bold)}
        >
          {<i
            className={classNames(
              'ai ai-circlecancel',
              classes.color_blueDark,
              classes.fontSize_16,
              classes.marginRight_10)}
          />}
          {getLanguageFromKey('sync_header.merge_conflict', this.props.language)}
        </p>);
    } else if (this.props.changesInLocalRepo) {
      return (
        <p
          className={classNames(
            { [classes.bold]: this.props.moreThanAnHourSinceLastPush },
          )}
        >
          {this.props.hasPushRight && <i className={classNames('ai ai-upload', classes.color_blueDark)} />}
          {getLanguageFromKey('sync_header.changes_to_share', this.props.language)}
        </p>);
    } else {
      return (
        <p>
          <i
            className={classNames('ai ai-check', classes.color_blueDarker)}
          />{getLanguageFromKey('sync_header.no_changes_to_share', this.props.language)}
        </p>);
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <Button
        onClick={this.shareChangesHandler}
        className={classNames(classes.color_blueDark, classes.clickable, classes.btn)}
      >
        {this.renderCorrectText()}
      </Button>
    );
  }
}

export default withStyles(styles)(ShareChangesCompoenent);
