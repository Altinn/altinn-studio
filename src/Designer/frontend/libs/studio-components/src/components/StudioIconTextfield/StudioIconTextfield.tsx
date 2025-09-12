import React, { forwardRef, useId } from 'react';

import cn from 'classnames';
import classes from './StudioIconTextfield.module.css';
import type { Override } from '../../types/Override';
import { PadlockLockedFillIcon } from '@studio/icons';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';

export type StudioIconTextfieldProps = Override<
  { icon?: React.ReactNode; label: string },
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
        <IconLabel
          htmlFor={textFieldId}
          id={textFieldId}
          icon={icon}
          label={label}
          readonly={readOnly}
        />
        <StudioTextfield
          disabled={readOnly}
          className={classes.textfield}
          aria-labelledby={textFieldId}
          value={rest.value}
          onChange={rest.onChange as React.ChangeEventHandler<HTMLInputElement>}
          error={rest.error}
          description={rest.description}
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
