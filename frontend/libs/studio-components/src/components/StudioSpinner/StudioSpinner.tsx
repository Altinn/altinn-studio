import React from 'react';
import type { ReactElement } from 'react';
import { Spinner } from '@digdir/designsystemet-react';
import type { SpinnerProps } from '@digdir/designsystemet-react';

export type StudioSpinnerProps = SpinnerProps;

export function StudioSpinner(props: StudioSpinnerProps): ReactElement {
  return <Spinner {...props} />;
}
