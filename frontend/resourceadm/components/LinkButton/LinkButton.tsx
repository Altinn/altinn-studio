import React, { ReactNode } from 'react';
import classes from './LinkButton.module.css';

interface Props {
  text: string;
  icon?: ReactNode;
  onClick?: () => void;
}

/**
 * 'button' element that looks like a link.
 *
 * @param props.text text to display on the element
 * @param props.href the href of the 'a' element
 * @param props.icon icon to be displayed
 *
 * TODO - Solve issue with visited.
 */
export const LinkButton = ({ text, icon, onClick }: Props) => {
  return (
    <button className={classes.linkButton} onClick={onClick}>
      {text}
      {icon}
    </button>
  );
};
