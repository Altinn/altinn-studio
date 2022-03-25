import { createTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import React from 'react';
import altinnTheme from '../../theme/altinnStudioTheme';

export interface IAltinnIconCompontentProvidedProps {
  classes: any;
  iconClass: string;
  isActive: boolean;
  iconColor: any;
}

const theme = createTheme(altinnTheme);

const styles = {
  activeIcon: {
    color: theme.altinnPalette.primary.blueDark,
  },
};

class AltinnIcon extends React.Component<IAltinnIconCompontentProvidedProps> {
  public render() {
    return (
      <i
        className={classNames(this.props.iconClass)}
        style={{
          color: this.props.isActive
            ? styles.activeIcon.color
            : this.props.iconColor,
        }}
      />
    );
  }
}

export default withStyles(styles)(AltinnIcon);
