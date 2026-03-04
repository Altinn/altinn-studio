import type { useCheckboxGroup } from '@digdir/designsystemet-react';

export type StudioGetCheckboxProps = ReturnType<
  ReturnType<typeof useCheckboxGroup>['getCheckboxProps']
>;
