import { StudioField, StudioLabel } from '@studio/components';
import { useId, type PropsWithChildren } from 'react';

export const LabelValue = ({ label, children }: PropsWithChildren<{ label: string }>) => {
  const labelId = useId();
  return (
    <StudioField>
      <StudioLabel id={labelId}>{label}</StudioLabel>
      <br />
      <span aria-labelledby={labelId}>{children}</span>
    </StudioField>
  );
};
