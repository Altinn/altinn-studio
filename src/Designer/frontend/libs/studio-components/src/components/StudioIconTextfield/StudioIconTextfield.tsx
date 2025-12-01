import React, { forwardRef, useId } from 'react';
import classes from './StudioIconTextfield.module.css';
import type { Override } from '../../types/Override';
import { PadlockLockedFillIcon } from '@studio/icons';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';
import cn from 'classnames';

export type StudioIconTextfieldProps = Override<
  {
    icon?: React.ReactNode;
    label: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
  },
  Omit<StudioTextfieldProps, 'onChange' | 'onBlur'>
>;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    {
      icon,
      id,
      label,
      className: givenClassName,
      readOnly,
      value,
      onChange,
      onBlur,
      error,
      description,
    }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const labelId = `${inputId}-label`;
    const className = cn(givenClassName, classes.container);

    return (
      <div className={className} ref={ref}>
        <IconLabel htmlFor={inputId} id={labelId} icon={icon} label={label} readonly={readOnly} />
        <StudioTextfield
          disabled={readOnly}
          className={classes.textfield}
          aria-labelledby={labelId}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          description={description}
        />
      </div>
    );
  },
);

type IconLabelProps = {
  htmlFor: string;
  id: string;
  icon?: React.ReactNode;
  label: string;
  readonly?: boolean;
};

const IconLabel = ({ htmlFor, id, icon, label, readonly }: IconLabelProps): React.ReactElement => {
  return (
    <div className={classes.iconLabel}>
      {icon}
      <StudioLabelAsParagraph data-size='sm' htmlFor={htmlFor} id={id}>
        {label}
      </StudioLabelAsParagraph>
      {readonly && <PadlockLockedFillIcon className={classes.padLockIcon} />}
    </div>
  );
};

StudioIconTextfield.displayName = 'StudioIconTextfield';
