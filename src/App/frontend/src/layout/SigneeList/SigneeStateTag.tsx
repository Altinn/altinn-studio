import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/SigneeList/SigningStateTag.module.css';
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

const NOTIFICATION_FAILED_HINT = {
  Configuration: 'signee_list.notification_failed_hint_configuration',
  ServiceOwnerUnavailable: 'signee_list.notification_failed_hint_configuration',
  Rejected: 'signee_list.notification_failed_hint_rejected',
  Unknown: 'signee_list.notification_failed_hint_rejected',
} as const;

function getNotificationFailedHint(state: SigneeState): string | undefined {
  return state.notificationFailure ? NOTIFICATION_FAILED_HINT[state.notificationFailure] : undefined;
}

export function SigneeStateTag({ state }: { state: SigneeState }) {
  const status = getSigneeStatus(state);
  const colorByStatus: Record<SigneeStatus, React.ComponentProps<typeof Tag>['data-color']> = {
    signed: 'success',
    delegationFailed: 'danger',
    notificationFailed: 'warning',
    waiting: 'neutral',
  };

  const notificationFailedHint = status === 'notificationFailed' ? getNotificationFailedHint(state) : undefined;

  return (
    <>
      <Tag
        data-color={colorByStatus[status]}
        data-size='sm'
        className={classes.stateTag}
      >
        <Lang id={SIGNEE_STATUS[status]} />
      </Tag>
      {notificationFailedHint && (
        <span className={classes.notificationFailedHint}>
          <Lang id={notificationFailedHint} />
        </span>
      )}
    </>
  );
}
