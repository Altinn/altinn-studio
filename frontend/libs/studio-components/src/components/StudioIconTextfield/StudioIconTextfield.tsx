import React, { forwardRef, useId } from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import cn from 'classnames';
import classes from './StudioIconTextfield.module.css';
import type { Override } from '../../types/Override';
import { Label } from '@digdir/designsystemet-react';

export type StudioIconTextfieldProps = Override<
  {
    icon?: React.ReactNode;
    label: string;
  },
  StudioTextfieldProps
>;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    { icon, id, label, className: givenClassName, ...rest }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const generatedId = useId();
    const textFieldId = id ?? generatedId;
    const className = cn(givenClassName, classes.container);
    return (
      <div className={className} ref={ref}>
        <IconLabel htmlFor={textFieldId} icon={icon} label={label} />
        <StudioTextfield id={textFieldId} size='small' className={classes.textfield} {...rest} />
      </div>
    );
  },
);

type IconLabelProps = {
  htmlFor: string;
  icon?: React.ReactNode;
  label: string;
};

const IconLabel = ({ htmlFor, icon, label }: IconLabelProps): React.ReactElement => {
  return (
    <div className={classes.iconLabel}>
      {icon}
      <Label size='small' htmlFor={htmlFor}>
        {label}
      </Label>
    </div>
  );
};

StudioIconTextfield.displayName = 'StudioIconTextfield';
