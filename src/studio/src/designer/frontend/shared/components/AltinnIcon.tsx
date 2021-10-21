import { createTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnIconComponentProvidedProps {
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

export function AltinnIconComponent(props:IAltinnIconComponentProvidedProps) {
  const color = props.isActive ? props.isActiveIconColor : props.iconColor;
  const style = {
    ...(color && { color }),
    ...(props.iconSize && { fontSize: props.iconSize }),
    ...(props.iconSize && { fontSize: props.iconSize }),
    ...(props.weight && { fontWeight: props.weight }),
    ...(props.margin && { margin: props.margin }),
    ...(props.padding && { padding: props.padding }),
  };
  return (
    <i
      className={
        classNames(
          props.iconClass,
        )}
      style={Object.keys(style).length ? style : undefined}
    />
  );
}

export default withStyles(styles)(AltinnIconComponent);
