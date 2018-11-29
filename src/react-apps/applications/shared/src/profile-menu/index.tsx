import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import * as React from 'react';

export interface IProfileMenuComponentProps {
  service?: string;
  org?: string;
}

export interface IProfileMenuComponentState {
  anchorEl: any;
}

class ProfileMenuComponent extends React.Component<IProfileMenuComponentProps, IProfileMenuComponentState> {
  constructor(_props: IProfileMenuComponentProps, _state: IProfileMenuComponentState) {
    super(_props, _state);

    this.state = {
      anchorEl: null,
    };
  }

  public handleClick = (event: any) => {
    this.setState({ anchorEl: event.currentTarget });
  }

  public handleClose = () => {
    this.setState({ anchorEl: null });
  }

  public render() {
    const { anchorEl } = this.state;

    return (
      <div>
        <Button
          aria-owns={anchorEl ? 'simple-menu' : undefined}
          aria-haspopup='true'
          onClick={this.handleClick}
        >
          Open Menu
        </Button>
        <Menu
          id='simple-menu'
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          <MenuItem onClick={this.handleClose}>Profile</MenuItem>
          <MenuItem onClick={this.handleClose}>My account</MenuItem>
          <MenuItem onClick={this.handleClose}>Logout</MenuItem>
        </Menu>
      </div>
    );
  }
}

export default ProfileMenuComponent;
