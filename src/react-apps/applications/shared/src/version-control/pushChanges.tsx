import * as React from 'react';
import { createStyles, withStyles } from '@material-ui/core';
import classNames = require('classnames');

export interface IPushChangesCompoenentProvidedProps {
  classes: any;
  pushChanges: any;
  changesInLocalRepo: boolean;
  moreThanAnHourSinceLastPush: boolean;
  hasPushRight: boolean;
}

export interface IPushChangesCompoenentProps extends IPushChangesCompoenentProvidedProps {

}

export interface IPushChangesCompoenentState {

}

const styles = createStyles({
  color: {
    color: '#022F51',
  },
  color_p: {
    color: '#0062BA',
  },
  bold: {
    fontWeigth: '500',
  },
});

class PushChangesCompoenent extends React.Component<IPushChangesCompoenentProps, IPushChangesCompoenentState> {
  public pushChangesHandler = () => {
    this.props.pushChanges();
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
          Del endringer
        </p>);
    } else {
      return (
        <p>
          <i className={classNames('ai ai-check', classes.color)} />Du har ingen endringer å dele
      </p>);
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <div onClick={this.pushChangesHandler} className={classes.color_p}>
        {this.renderCorrectText()}
      </div>
    );
  }
}

export default withStyles(styles)(PushChangesCompoenent);
