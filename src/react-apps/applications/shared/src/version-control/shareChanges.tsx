import { createMuiTheme, createStyles, withStyles } from '@material-ui/core';
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
  language: any;
}

export interface IShareChangesCompoenentProps extends IShareChangesCompoenentProvidedProps {

}

export interface IShareChangesCompoenentState {

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
  clickable: {
    '&:hover': {
      cursor: 'pointer',
    },
    'maxWidth': '260px',
    [theme.breakpoints.down('md')]: {
      float: 'right',
      marginRight: '10px',
    },
  },
});

class ShareChangesCompoenent extends React.Component<IShareChangesCompoenentProps, IShareChangesCompoenentState> {
  public shareChangesHandler = (event: any) => {
    if (this.props.changesInLocalRepo) {
      this.props.shareChanges(event.currentTarget);
    }
  }

  public renderCorrectText() {
    const { classes } = this.props;
    if (this.props.changesInLocalRepo) {
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
      <div
        onClick={this.shareChangesHandler}
        className={classNames(classes.color_blueDark, classes.clickable)}
      >
        {this.renderCorrectText()}
      </div>
    );
  }
}

export default withStyles(styles)(ShareChangesCompoenent);
