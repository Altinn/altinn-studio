import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Chip } from '@digdir/designsystemet-react';
import type { ChipRemovableProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioChipRemovableProps = WithoutAsChild<ChipRemovableProps>;

function StudioChipRemovable(
  { children, ...rest }: StudioChipRemovableProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  return (
    <Chip.Removable ref={ref} {...rest}>
      {children}
    </Chip.Removable>
  );
}

const ForwardedStudioChipRemovable = forwardRef(StudioChipRemovable);
ForwardedStudioChipRemovable.displayName = 'StudioChip.Removable';

export { ForwardedStudioChipRemovable as StudioChipRemovable };
