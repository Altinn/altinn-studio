//import Drawer from '@material-ui/core/Drawer';
import * as React from 'react';
import '../styles/NavMenu';
import {leftNavMenuSettings} from './leftNavMenuSettings';
import {NavMenuItem} from './NavMenuItem';

export interface INavMenuState {
  open: boolean;
  openItems: number[];
  activeItem?: number;
}

export interface INavMenuProps { }

export class NavMenu extends React.Component<INavMenuProps, INavMenuState> {
  constructor(_props: INavMenuProps, _state: INavMenuState) {
    super(_props, _state);

    this.state = {
      open: true,
      openItems: [],
    };
  }

  public handleDrawerOpen = () => {
    this.setState({open: true});
  }

  public handleDrawerClose = () => {
    this.setState({open: false});
  }

  public toggleMenu = () => {
    this.state.open ? this.handleDrawerClose() : this.handleDrawerOpen();
  }

  public toggleItemActive = (id: number) => {
    this.setState((state: INavMenuState) => {
      return {
        activeItem: id,
      };
    });
  }

  public render() {
    return (
      <div id={'sidebar'} className={this.state.open ? 'container sidebar sidebar-open' : 'container sidebar sidebar-closed'}>
        <div className={'row'}>
          {leftNavMenuSettings.menuHierarchy.map((menuList: any, index: number) => {
            return (
              <NavMenuItem
                key={index}
                id={index}
                listItems={menuList.items}
                name={menuList.displayText}
                navLink={menuList.navLink}
                show={this.state.open}
                active={this.state.activeItem === index}
                toggleActive={this.toggleItemActive}
              />
            );
          })}
        </div>
        <div className={this.state.open ? 'toggle-menu-row hide-menu-row' : 'toggle-menu-row show-menu-row'}>
          <button className={'nav-menu-item toggle-menu'} onClick={this.toggleMenu}>
          {this.state.open ?
          <span><i className='fas fa-angle-double-left'/>Skjul meny</span>
          :  <i className='fas fa-angle-double-right'/>}
          
          </button>
        </div>
      </div>
    );
  }
}
