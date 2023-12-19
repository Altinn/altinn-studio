import React from 'react';
import classes from './ConfigDetailsRow.module.css';
import { Paragraph } from '@digdir/design-system-react';

export type ConfigDetailsRowProps = {
  title: string;
  text: string;
};

/**
 * @component
 *    Displays rows in the config panel with title and text
 *
 * @property {title}[string] - The title in bold
 * @property {text}[string] - The text
 *
 * @returns {JSX.Element} - The rendered component
 */
export const ConfigDetailsRow = ({ title, text }: ConfigDetailsRowProps): JSX.Element => (
  <div className={classes.wrapper}>
    <Paragraph size='small'>
      <strong>{title}</strong>
    </Paragraph>
    <Paragraph size='small'>{text}</Paragraph>
  </div>
);
