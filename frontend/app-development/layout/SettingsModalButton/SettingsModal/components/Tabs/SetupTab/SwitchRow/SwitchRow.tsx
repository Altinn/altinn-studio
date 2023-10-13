import React, { ReactNode } from 'react';
import classes from './SwitchRow.module.css';
import { Paragraph, Switch } from '@digdir/design-system-react';

export type SwitchRowProps = {
  checked: boolean;
  onSave: (checked: boolean) => void;
  label: string;
};

/**
 * @component
 *    Displays a Switch component with a label to the right
 *
 * @property {boolean}[chekded] - If the switch is on or off
 * @property {function}[onSave] - Function to be executed when clicking the switch
 * @property {boolean}[label] - The label of the switch
 *
 * @returns {ReactNode} - The rendered component
 */
export const SwitchRow = ({ checked, onSave, label }: SwitchRowProps): ReactNode => {
  return (
    <Switch className={classes.switch} checked={checked} onChange={(e) => onSave(e.target.checked)}>
      <Paragraph size='small'>{label}</Paragraph>
    </Switch>
  );
};
