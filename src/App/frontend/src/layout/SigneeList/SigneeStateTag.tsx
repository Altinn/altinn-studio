import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import type { SigneeState } from 'src/layout/SigneeList/api';

export const SIGNEE_STATUS = {
  signed: 'signee_list.signee_status_signed',
  waiting: 'signee_list.signee_status_waiting',
  delegationFailed: 'signee_list.signee_status_delegation_failed',
  notificationFailed: 'signee_list.signee_status_notification_failed',
} as const;

export type SigneeStatus = keyof typeof SIGNEE_STATUS;

function getSigneeStatus(state: SigneeState): SigneeStatus {
  if (state.hasSigned) {
    return 'signed';
  }

  if (state.delegationSuccessful === false) {
    return 'delegationFailed';
  }

  if (state.notificationStatus === 'Failed') {
    return 'notificationFailed';
  }

  return 'waiting';
}

export function SigneeStateTag({ state }: { state: SigneeState }) {
  const status = getSigneeStatus(state);
  const colorByStatus: Record<SigneeStatus, React.ComponentProps<typeof Tag>['data-color']> = {
    signed: 'success',
    delegationFailed: 'danger',
    notificationFailed: 'warning',
    waiting: 'neutral',
  };

  return (
    <Tag
      data-color={colorByStatus[status]}
      data-size='sm'
    >
      <Lang id={SIGNEE_STATUS[status]} />
    </Tag>
  );
}
