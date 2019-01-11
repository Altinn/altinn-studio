import { createStyles, withStyles } from '@material-ui/core';
import Drawer from '@material-ui/core/Drawer';
import * as React from 'react';
import { connect } from 'react-redux';

const styles = createStyles({
  drawer: {
    width: 240,
    flexShrink: 0,
  },
  drawerHeader: {
   display: 'flex',
   alignItems: 'center',
   padding: '0 8px',
   justifyContent: 'flex-end',
 },
});

export interface IServiceLogicMenuProps {
  classes: any;
  open: boolean;
}

export interface IServiceLogicMenuState {
  open: boolean;
}

class Menu extends React.Component<IServiceLogicMenuProps> {
  constructor(_props: IServiceLogicMenuProps, _state: IServiceLogicMenuState) {
    super(_props, _state);
    this.state = {
      open: false,
    };
  }
  public handleDrawerOpen = () => {
    this.setState({
      open: true,
    });
  }
  public render(): JSX.Element {
    return(
      <>
        <div onClick={this.handleDrawerOpen}>
          Click on me
        </div>
        <Drawer
          className={this.props.classes.drawer}
          variant={'persistent'}
          anchor={'right'}
          open={this.props.open}
        >
        <div className={this.props.classes.drawerHeader}>
          hello
        </div>
        </Drawer>
      </>
    );
  }
}

const makeMapStateToProps = () => {
  const mapStateToProps = (
    props: IServiceLogicMenuProps,
  ) => {
    return {
      classes: props.classes,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles, {withTheme: true})(connect(makeMapStateToProps)(Menu));
