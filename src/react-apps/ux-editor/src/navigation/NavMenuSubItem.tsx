import * as React from 'react';

export interface INavMenuSubItemState {}

export interface INavMenuSubItemProps {
  navLink: string;
  name: string;
  topLevel: boolean;
}

export class NavMenuSubItem extends React.Component<INavMenuSubItemProps, INavMenuSubItemState> {
  public render() {
    return(
      <li>
        <a href={this.props.navLink}>{this.props.name}</a>
      </li>
    );
  }
}