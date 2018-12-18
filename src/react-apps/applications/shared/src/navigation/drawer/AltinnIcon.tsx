import { createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../../theme/altinnStudioTheme';

export interface IAltinnIconCompontentProvidedProps {
  classes: any;
  iconClass: string;
  isActive: boolean;
}

export interface IAltinnIconComponentState {
}
const theme = createMuiTheme(altinnTheme);

const styles = {
  icon: {
    'fontSize': 16,
    '&:hover': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      fontWeight: 500,
    },
  },
  activeIcon: {
    fontSize: 16,
    color: theme.altinnPalette.primary.blueDark,
    fontWeight: 500,
  },
};

class AltinnIcon extends React.Component<IAltinnIconCompontentProvidedProps, IAltinnIconComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <i
        className={
          classNames(
            this.props.iconClass,
          )}
      />
    );
  }
}

export default withStyles(styles)(AltinnIcon);
