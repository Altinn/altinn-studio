import Radio, { RadioProps } from '@material-ui/core/Radio';
import cn from 'classnames';
import React from 'react';
import { useRadioStyles } from 'src/components/base/RadioButtons/radioButtonsUtils';

export const StyledRadio = (radioProps: RadioProps) => {
  const classes = useRadioStyles();

  return (
    <Radio
      className={classes.root}
      disableRipple={true}
      checkedIcon={<span className={cn(classes.icon, classes.checkedIcon)} />}
      icon={<span className={classes.icon} />}
      {...radioProps}
    />
  );
};
