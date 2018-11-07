import * as React from 'react';
import {INavMenuSubItemProps, NavMenuSubItem} from './NavMenuSubItem';

export interface INavMenuItemState {
  open: boolean;
}

export interface INavMenuItemProps {
  listItems: INavMenuSubItemProps[];
  name: string;
  navLink: string;
  show: boolean;
  id: number;
  active: boolean;
  toggleActive: (id: number) => void;
}

export class NavMenuItem extends React.Component<INavMenuItemProps, INavMenuItemState> {
  constructor(_props: INavMenuItemProps, _state: INavMenuItemState) {
    super(_props, _state);
    this.state = {
      open: false,
    };
  }

  public handleItemOpen = () => {
    this.setState({open: true});
  }

  public handleItemClose = () => {
    this.setState({open: false});
  }

  public toggleItem = (id: number) => {
    this.state.open ? this.handleItemClose() : this.handleItemOpen();
    this.props.toggleActive(id);
  }

  public render() {
    return (
      <div className={'col col-lg-12'}>
        <button
          type={'button'}
          onClick={this.toggleItem.bind(this, this.props.id)}
          className={this.props.active ? 'nav-menu-item active-item' : 'nav-menu-item'}
        >
          {this.props.show ? this.props.name : null}
        </button>
        <ul>
          {this.props.show && this.state.open ?
            this.props.listItems.map((itemProps: INavMenuSubItemProps, index: number) => {
            return (
            <NavMenuSubItem
              key={index}
              name={itemProps.name}
              navLink={itemProps.navLink}
              topLevel={itemProps.topLevel}
            />);
          }) : null}
        </ul>
      </div>
    );
  }
}