import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Chip } from '@digdir/designsystemet-react';
import type { ChipRadioProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioChipRadioProps = WithoutAsChild<ChipRadioProps>;

function StudioChipRadio(
  { children, ...rest }: StudioChipRadioProps,
  ref: Ref<HTMLLabelElement>,
): ReactElement {
  return (
    <Chip.Radio ref={ref} {...rest}>
      {children}
    </Chip.Radio>
  );
}

const ForwardedStudioChipRadio = forwardRef(StudioChipRadio);
ForwardedStudioChipRadio.displayName = 'StudioChip.Radio';

export { ForwardedStudioChipRadio as StudioChipRadio };
