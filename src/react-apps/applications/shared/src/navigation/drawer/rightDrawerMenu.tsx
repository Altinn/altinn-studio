import { createStyles, Drawer, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
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
    position: 'absolute',
  },
  scrollable: {
    overflowY: 'scroll',
    height: 'inherit',
    marginTop: '0px',
    maxHeight: `calc(100vh - 146px)`,
  },
});

export interface IServiceLogicMenuProvidedProps {
  classes: any;
  open: boolean;
  button: any;
  openCloseHandler: any;
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
  constructor(_props: IServiceLogicMenuProps) {
    super(_props);
    this.state = {
      open: _props.open,
      button: _props.button,
    };
  }
  public handleDrawerOpen = () => {
    this.setState({
      open: !this.state.open,
    });
    this.props.openCloseHandler();
  }
  public handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      this.handleDrawerOpen();
    }
  }
  public render(): JSX.Element {
    return (
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
          classes={{ paper: this.props.classes.paper }}
          SlideProps={{ unmountOnExit: false }}
        >
          <div className={classNames(this.props.classes.drawerHeader, this.props.classes.scrollable)}>
            {this.props.children}

          </div>
        </Drawer>
      </>
    );
  }
}

export default withStyles(styles, { withTheme: true })(Menu);
