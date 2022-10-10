import React from 'react';
import {Icon, IconImage} from './Icon';
import classes from './ActionMenu.module.css';
import cn from 'classnames';

export interface IActionMenuProps {
  className?: string;
  items: IActionMenuItemProps[]
  openButtonText: string;
}

export interface IActionMenuItemProps {
  action: () => void;
  className?: string;
  icon: IconImage;
  text: string;
}

export const ActionMenu = ({openButtonText, className, items}: IActionMenuProps) => (
  <div className={cn(classes.root, className)}>
    <div className={classes.menu}>
      <button className={classes.openButton}>
        {openButtonText}
      </button>
      <ul className={classes.list}>
        {items.map((item) => <ActionMenuItem key={item.text} {...item}/>)}
      </ul>
    </div>
  </div>
);

const ActionMenuItem = ({action, className, icon, text}: IActionMenuItemProps) => (
  <li className={cn(classes.item, className)}>
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
