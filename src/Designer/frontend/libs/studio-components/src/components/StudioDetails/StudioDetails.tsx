import type { ReactElement } from 'react';
import { Details } from '@digdir/designsystemet-react';
import type { DetailsProps } from '@digdir/designsystemet-react';

export type StudioDetailsProps = Omit<DetailsProps, 'onToggle'> & {
  /** Omit when the open state is controlled elsewhere. Example: PageAccordion.tsx */
  onToggle?: (event: Event) => void;
};

const ignoreToggle = (): void => undefined;

export function StudioDetails({
  children,
  onToggle = ignoreToggle,
  ...rest
}: StudioDetailsProps): ReactElement {
  return (
    <Details {...(rest as DetailsProps)} onToggle={onToggle}>
      {children}
    </Details>
  );
}
