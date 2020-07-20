import { createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnIconCompontentProvidedProps {
  iconClass: string;
  isActive?: boolean;
  isActiveIconColor?: string;
  iconColor: any;
  iconSize?: number|string;
  padding?: string;
  margin?: string;
  weight?: number;
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  activeIcon: {
    color: theme.altinnPalette.primary.blueDark,
  },
};

export function AltinnIconComponent(props: IAltinnIconCompontentProvidedProps) {
  const {
    isActive,
    isActiveIconColor,
    iconClass,
    iconColor,
    iconSize,
    weight,
    margin,
    padding,
  } = props;

  return (
    <i
      className={
        classNames(
          iconClass,
        )}
      style={{
        color: isActive ? isActiveIconColor : iconColor,
        fontSize: iconSize || null,
        fontWeight: weight || null,
        margin: margin || null,
        padding: padding || null,
      }}
    />
  );
}

export default withStyles(styles)(AltinnIconComponent);
