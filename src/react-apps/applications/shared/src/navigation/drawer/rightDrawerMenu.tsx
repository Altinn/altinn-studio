import { createStyles, Drawer, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../theme/altinnStudioTheme';

const styles = createStyles({
  drawer: {
    width: 240,
    flexShrink: 0,
    top: 64,
  },
  drawerHeader: {
   display: 'flex',
   alignContent: 'flex-start',
 },
 hidden: {
   visibility: 'hidden',
 },
 paper: {
   borderTop: '1px solid ' + altinnTheme.altinnPalette.primary.greyMedium,
   background: altinnTheme.altinnPalette.primary.greyLight,
   top: 146,
   width: 240,
 },
});

export interface IServiceLogicMenuProvidedProps {
  classes: any;
  open: boolean;
  button: any;
}
export interface IServiceLogicMenuProps extends IServiceLogicMenuProvidedProps {
  open: boolean;
  button: any;
}

export interface IServiceLogicMenuState {
  open: boolean;
  button: any;
}

class Menu extends React.Component<IServiceLogicMenuProps, IServiceLogicMenuState> {
  constructor(_props: IServiceLogicMenuProps, _state: IServiceLogicMenuState) {
    super(_props, _state);
    this.state = {
      open: _props.open,
      button: _props.button,
    };
  }
  public handleDrawerOpen = () => {
    this.setState({
      open: !this.state.open,
    });
  }
  public handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      this.handleDrawerOpen();
    }
  }
  public render(): JSX.Element {
    return(
      <>
        <div
          onClick={this.handleDrawerOpen}
          tabIndex={0}
          onKeyPress={this.handleKeyPress}
        >
          {this.props.button}
        </div>
        <Drawer
          className={this.state.open ? this.props.classes.drawer :
            this.props.classes.drawer + ' ' + this.props.classes.hidden}
          variant={'persistent'}
          anchor={'right'}
          open={this.state.open}
          classes={{paper: this.props.classes.paper}}
          SlideProps={{unmountOnExit: false}}
        >
        <div className={this.props.classes.drawerHeader}>
          {this.props.children}
        </div>
        </Drawer>
      </>
    );
  }
}

const makeMapStateToProps = (
    state: IAppState,
    props: IServiceLogicMenuProvidedProps,
  ): IServiceLogicMenuProps => {
    return {
        classes: props.classes,
        button: props.button,
        open: props.open,
      };
    };

export const ServiceLogicMenu = withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(Menu));
