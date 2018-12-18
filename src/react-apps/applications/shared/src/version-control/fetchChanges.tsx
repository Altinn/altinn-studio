import * as React from 'react';
import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import classNames = require('classnames');

export interface IFetchChangesCompoenentProvidedProps {
  classes: any;
  fetchChanges: any;
  changesInMaster: boolean;
}

export interface IFetchChangesComponenetProps extends IFetchChangesCompoenentProvidedProps {

}

export interface IFetchChangesComponenetState {

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

class FetchChangesComponenet extends React.Component<IFetchChangesComponenetProps, IFetchChangesComponenetState> {

  public fetchChangesHandler = () => {
    this.props.fetchChanges();
  }

  public render() {
    const { classes } = this.props;
    return (
      <div onClick={this.fetchChangesHandler}>
        <p
          className={classNames(
            classes.color_p,
            { [classes.bold]: this.props.changesInMaster },
          )}
        >
          <i className={classNames('ai ai-download', classes.color)} /> Hent endringer
        </p>
      </div>
    );
  }
}

export default withStyles(styles)(FetchChangesComponenet);
