import type { ReactElement } from 'react';
import { Tooltip } from '@digdir/designsystemet-react';
import type { TooltipProps } from '@digdir/designsystemet-react';

export type StudioTooltipProps = TooltipProps;

/** Text that shows when the user hovers over or focuses the element it wraps. */
export function StudioTooltip(props: StudioTooltipProps): ReactElement<StudioTooltipProps> {
  return <Tooltip {...props} />;
}
