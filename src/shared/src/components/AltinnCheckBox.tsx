import { Checkbox, makeStyles } from '@material-ui/core';
import React = require('react');
export interface IAltinnCheckBoxComponentProvidedProps {
  /** If the component is checked */
  checked: boolean;
  /** If the component should be disabeld */
  disabled?: boolean;
  /** Check box component ID */
  id?: any;
  /** Called when onChange is triggered */
  onChangeFunction?: any;
  /** Called when onKeyPress is triggered */
  onKeyPressFunction?: any;
}

const useStyles = makeStyles((theme) => ({
  altinnCheckBox: {
    color: `${theme.altinnPalette.primary.blueDark} !important`,
    '& span': {
      '& svg': {
        fontSize: '2.5rem',
      },
    },
  },
}));

export const AltinnCheckBox = ({
  id,
  checked,
  onChangeFunction,
  disabled,
  onKeyPressFunction,
}: IAltinnCheckBoxComponentProvidedProps) => {
  const classes = useStyles();

  return (
    <Checkbox
      id={id}
      className={classes.altinnCheckBox}
      checked={checked}
      onChange={onChangeFunction}
      disabled={disabled ? disabled : false}
      onKeyPress={onKeyPressFunction}
      tabIndex={0}
      disableRipple={false}
    />
  );
};

export default AltinnCheckBox;
