import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Chip } from '@digdir/designsystemet-react';
import type { ChipCheckboxProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioChipCheckboxProps = WithoutAsChild<ChipCheckboxProps>;

function StudioChipCheckbox(
  { children, ...rest }: StudioChipCheckboxProps,
  ref: Ref<HTMLLabelElement>,
): ReactElement {
  return (
    <Chip.Checkbox ref={ref} {...rest}>
      {children}
    </Chip.Checkbox>
  );
}

const ForwardedStudioChipCheckbox = forwardRef(StudioChipCheckbox);
ForwardedStudioChipCheckbox.displayName = 'StudioChip.Checkbox';

export { ForwardedStudioChipCheckbox as StudioChipCheckbox };
