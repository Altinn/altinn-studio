import React from 'react';
import type { ReactElement } from 'react';
import { Switch } from '@digdir/designsystemet-react';
import type { SwitchProps } from '@digdir/designsystemet-react';

export type StudioSwitchProps = SwitchProps;

export function StudioSwitch(props: StudioSwitchProps): ReactElement<StudioSwitchProps> {
  return <Switch {...props} />;
}
