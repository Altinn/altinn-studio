import React, { ReactNode } from 'react';
import classes from './Link.module.css';

interface Props {
  text: string;
  href: string;
  icon?: ReactNode;
}

/**
 * 'a' element Link.
 *
 * @param props.text text to display on the element
 * @param props.href the href of the 'a' element
 * @param props.icon icon to be displayed
 *
 * TODO - Solve issue with visited.
 */
export const Link = ({ text, href, icon }: Props) => {
  return (
    <a className={classes.link} href={href}>
      {text}
      {icon}
    </a>
  );
};
