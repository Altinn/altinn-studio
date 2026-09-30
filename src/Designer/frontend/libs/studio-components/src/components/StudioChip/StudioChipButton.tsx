import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Chip } from '@digdir/designsystemet-react';
import type { ChipButtonProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioChipButtonProps = WithoutAsChild<ChipButtonProps>;

function StudioChipButton(
  { children, ...rest }: StudioChipButtonProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  return (
    <Chip.Button ref={ref} {...rest}>
      {children}
    </Chip.Button>
  );
}

const ForwardedStudioChipButton = forwardRef(StudioChipButton);
ForwardedStudioChipButton.displayName = 'StudioChip.Button';

export { ForwardedStudioChipButton as StudioChipButton };
