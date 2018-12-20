import * as React from 'react';
import { createStyles, withStyles } from '@material-ui/core';
import classNames = require('classnames');
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

const styles = createStyles({
  color: {
    color: '#022F51',
  },
  color_p: {
    color: '#0062BA',
  },
  bold: {
    fontWeight: 500,
  },
});

class ShareChangesCompoenent extends React.Component<IShareChangesCompoenentProps, IPushChangesCompoenentState> {
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
          {this.props.hasPushRight && <i className={classNames('ai ai-upload', classes.color)} />}
          {getLanguageFromKey('sync_header.changes_to_share', this.props.language)}
        </p>);
    } else {
      return (
        <p>
          <i
            className={classNames('ai ai-check', classes.color)}
          />{getLanguageFromKey('sync_header.no_changes_to_share', this.props.language)}
        </p>);
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <div onClick={this.shareChangesHandler} className={classes.color_p}>
        {this.renderCorrectText()}
      </div>
    );
  }
}

export default withStyles(styles)(ShareChangesCompoenent);
