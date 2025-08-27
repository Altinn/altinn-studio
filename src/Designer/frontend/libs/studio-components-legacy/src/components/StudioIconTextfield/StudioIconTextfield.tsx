import React, { forwardRef, useId } from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import cn from 'classnames';
import classes from './StudioIconTextfield.module.css';
import type { Override } from '../../types/Override';
import { Label } from '@digdir/designsystemet-react';
import { PadlockLockedFillIcon } from '../../../../studio-icons';

export type StudioIconTextfieldProps = Override<
  {
    icon?: React.ReactNode;
    label: string;
  },
  StudioTextfieldProps
>;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    { icon, id, label, className: givenClassName, readOnly, ...rest }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const generatedId = useId();
    const textFieldId = id ?? generatedId;
    const className = cn(givenClassName, classes.container);
    return (
      <div className={className} ref={ref}>
        <IconLabel htmlFor={textFieldId} icon={icon} label={label} readonly={readOnly} />
        <StudioTextfield
          disabled={readOnly}
          id={textFieldId}
          className={classes.textfield}
          {...rest}
        />
      </div>
    );
  },
);

type IconLabelProps = {
  htmlFor: string;
  icon?: React.ReactNode;
  label: string;
  readonly?: boolean;
};

const IconLabel = ({ htmlFor, icon, label, readonly }: IconLabelProps): React.ReactElement => {
  return (
    <div className={classes.iconLabel}>
      {icon}
      <Label size='sm' htmlFor={htmlFor}>
        {label}
      </Label>
      {readonly && <PadlockLockedFillIcon className={classes.padLockIcon} />}
    </div>
  );
};

StudioIconTextfield.displayName = 'StudioIconTextfield';
