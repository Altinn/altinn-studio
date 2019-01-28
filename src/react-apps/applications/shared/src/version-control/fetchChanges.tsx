import { Button, createMuiTheme, createStyles, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
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
    maxWidth: '250px',
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

class FetchChangesComponenet extends React.Component<IFetchChangesComponenetProps, IFetchChangesComponenetState> {

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
        <p
          className={classNames(
            classes.color_blueDark,
            { [classes.bold]: this.props.changesInMaster === true },
          )}
        >
          <i
            className={classNames('ai ai-download', classes.color_blueDark)}
          /> {getLanguageFromKey('sync_header.fetch_changes', this.props.language)}
        </p>
      </Button>
    );
  }
}

export default withStyles(styles)(FetchChangesComponenet);
