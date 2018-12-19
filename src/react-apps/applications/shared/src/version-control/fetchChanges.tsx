import * as React from 'react';
import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import { getLanguageFromKey } from '../utils/language';

export interface IFetchChangesCompoenentProvidedProps {
  classes: any;
  fetchChanges: any;
  changesInMaster: boolean;
  language: any;
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
    fontWeight: 500,
  },
});

class FetchChangesComponenet extends React.Component<IFetchChangesComponenetProps, IFetchChangesComponenetState> {

  public fetchChangesHandler = (event: any) => {
    this.props.fetchChanges(event.currentTarget);
  }

  public render() {
    const { classes } = this.props;
    return (
      <div onClick={this.fetchChangesHandler}>
        <p
          className={classNames(
            classes.color_p,
            { [classes.bold]: this.props.changesInMaster === true },
          )}
        >
          <i
            className={classNames('ai ai-download', classes.color)}
          /> {getLanguageFromKey('sync_header.fetch_changes', this.props.language)}
        </p>
      </div>
    );
  }
}

export default withStyles(styles)(FetchChangesComponenet);
