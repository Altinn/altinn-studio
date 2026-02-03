import { StudioField, StudioLabel } from '@studio/components';
import { useId, type PropsWithChildren } from 'react';
import classes from './LabelValue.module.css';

export const LabelValue = ({ label, children }: PropsWithChildren<{ label: string }>) => {
  const labelId = useId();
  return (
    <StudioField>
      <StudioLabel id={labelId} className={classes.label}>
        {label}
      </StudioLabel>
      <span aria-labelledby={labelId}>{children}</span>
    </StudioField>
  );
};
