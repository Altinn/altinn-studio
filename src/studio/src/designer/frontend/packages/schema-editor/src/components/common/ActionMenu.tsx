import React from 'react';
import {Icon, IconImage} from './Icon';
import classes from './ActionMenu.module.css';
import cn from 'classnames';

export interface IActionMenuProps {
  openButtonText: string;
  className?: string;
  lists: IActionMenuItemProps[][]
}

export interface IActionMenuItemProps {
  action: () => void;
  icon: IconImage;
  text: string;
}

export const ActionMenu = ({openButtonText, className, lists}: IActionMenuProps) => (
  <div className={cn(classes.root, className)}>
    <div className={classes.menu}>
      <button className={classes.openButton}>
        {openButtonText}
      </button>
      {lists.map((items) => (
        <ul className={classes.list} key={items.map(({text}) => text).toString()}>
          {items.map((item) => <ActionMenuItem key={item.text} {...item}/>)}
        </ul>
      ))}
    </div>
  </div>
);

const ActionMenuItem = ({action, icon, text}: IActionMenuItemProps) => (
  <li className={classes.item}>
    <button
      className={classes.itemButton}
      name={text}
      onClick={(event) => {
        action();
        event.currentTarget.blur();
      }}
      role='menuitem'
    >
      <Icon image={icon} className={classes.icon}/>
      {text}
    </button>
  </li>
);
