import React, { ReactNode } from 'react';
import classes from './Link.module.css';

interface Props {
  text: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

/**
 * 'a' element button.
 *
 * @param props.text text to display on the element
 * @param props.href the href of the 'a' element
 * @param props.icon icon to be displayed
 * @returns
 */
export const Link = ({ text, href, onClick, icon }: Props) => {
  // TODO - Move the button to its own component to separate the button from the link
  if (onClick) {
    return (
      <button className={classes.link} onClick={onClick}>
        {text}
        {icon}
      </button>
    );
  }
  return (
    <a className={classes.link} href={href}>
      {text}
      {icon}
    </a>
  );
};
