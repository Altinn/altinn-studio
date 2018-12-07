import { Button, createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import 'typeface-roboto';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnIconButtonCompontentProvidedProps {
  classes: any;
  onclickFunction?: any;
  className?: string;
  iconClass: string;
  btnText: string;
}

export interface IAltinnIconButtonComponentProps extends IAltinnIconButtonCompontentProvidedProps {
}
export interface IAltinnIconButtonComponentState {
}
const theme = createMuiTheme(altinnTheme);

const styles = {
  dottedBtn: {
    minHeight: '60px',
    fontWeight: 700,
    width: '100%',
    color: '#000',
    textAlign: 'left' as 'left',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    border: '1px dotted ' + theme.palette.primary.dark,
    boxShadow: 'none',
    borderRadius: '0px',
    textTransform: 'none' as 'none',
    maxWidth: '170px',
    justifyContent: 'right',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
  dottedBtnIcon: {
    color: theme.palette.primary.dark,
    fontSize: '54px',
    paddingRight: '6px',
  },
}

class AltinnIconButton extends React.Component<IAltinnIconButtonComponentProps, IAltinnIconButtonComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Button variant='contained' className={classes.dottedBtn} >
        <i className={classNames(this.props.iconClass, classes.dottedBtnIcon)} />
        {this.props.btnText}
      </Button>
    );
  }
}

export default withStyles(styles)(AltinnIconButton);
