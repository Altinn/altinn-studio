import { Button, createTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnIconButtonComponentProvidedProps {
  classes: any;
  onclickFunction?: any;
  className?: string;
  iconClass: string;
  btnText: string;
  id?: any;
}

export interface IAltinnIconButtonComponentState {
}

const theme = createTheme(altinnTheme);

const styles = {
  dottedBtn: {
    'minHeight': '60px',
    'fontWeight': 700,
    'width': '100%',
    'color': '#000',
    'textAlign': 'left' as 'left',
    'verticalAlign': 'middle',
    'backgroundColor': 'transparent',
    'border': '1px dotted ' + theme.altinnPalette.primary.blueDark,
    'boxShadow': 'none',
    'borderRadius': '0px',
    'textTransform': 'none' as 'none',
    'maxWidth': '170px',
    'justifyContent': 'right',
    'fontSize': '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
  dottedBtnIcon: {
    color: theme.altinnPalette.primary.blueDark,
    fontSize: '54px',
    paddingRight: '6px',
  },
};


export class AltinnIconButton extends React.Component<IAltinnIconButtonComponentProvidedProps, IAltinnIconButtonComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Button id={this.props.id} variant='contained' className={classes.dottedBtn} onClick={this.props.onclickFunction}>
        <i className={classNames(this.props.iconClass, classes.dottedBtnIcon)} />
        {this.props.btnText}
      </Button>
    );
  }
}

export default withStyles(styles)(AltinnIconButton);
