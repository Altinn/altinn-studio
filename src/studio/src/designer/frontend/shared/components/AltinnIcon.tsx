import { createTheme } from '@material-ui/core';
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

const theme = createTheme(altinnTheme);

const styles = {
  activeIcon: {
    color: theme.altinnPalette.primary.blueDark,
  },
};

export function AltinnIconComponent(props:IAltinnIconCompontentProvidedProps) {
  return (
    <i
      className={
        classNames(
          props.iconClass,
        )}
      style={{
        color: props.isActive ? props.isActiveIconColor : props.iconColor,
        fontSize: props.iconSize ? props.iconSize : null,
        fontWeight: props.weight ? props.weight : null,
        margin: props.margin ? props.margin : null,
        padding: props.padding ? props.padding : null,
      }}
    />
  );
}

export default withStyles(styles)(AltinnIconComponent);
