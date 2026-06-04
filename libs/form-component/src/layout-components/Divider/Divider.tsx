import { Divider as DsDivider } from '@digdir/designsystemet-react';

export interface DividerProps {
  /** The component id, set on the underlying `<hr>` element. */
  id?: string;
}

export function Divider({ id }: DividerProps) {
  return <DsDivider id={id} />;
}
