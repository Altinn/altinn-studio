import React from 'react';

import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';

import { NotificationStatus } from 'src/layout/SigneeList/api';
import { SIGNEE_STATUS, SigneeStateTag } from 'src/layout/SigneeList/SigneeStateTag';

vi.mock('src/features/language/Lang', () => ({ Lang: ({ id }: { id: string }) => id }));

describe('SigneeStateTag', () => {
  it('should display a tag with name "signed" when status is "signed"', () => {
    render(
      <SigneeStateTag
        state={{
          name: null,
          organization: null,
          hasSigned: true,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Sent,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: new Date().toISOString(),
        }}
      />,
    );

    screen.getByText(SIGNEE_STATUS.signed);
  });

  it('should display a tag with name "delegationFailed" when status is "delegationFailed"', () => {
    render(
      <SigneeStateTag
        state={{
          name: null,
          organization: null,
          hasSigned: false,
          delegationSuccessful: false,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.NotSent,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: null,
        }}
      />,
    );

    screen.getByText(SIGNEE_STATUS.delegationFailed);
  });

  it('should display a tag with name "notificationFailed" when status is "notificationFailed"', () => {
    render(
      <SigneeStateTag
        state={{
          name: null,
          organization: null,
          hasSigned: false,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Failed,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: null,
        }}
      />,
    );

    screen.getByText(SIGNEE_STATUS.notificationFailed);
  });

  it('should display a tag with name "waiting" when status is "waiting"', () => {
    render(
      <SigneeStateTag
        state={{
          name: null,
          organization: null,
          hasSigned: false,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Sent,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: null,
        }}
      />,
    );

    screen.getByText(SIGNEE_STATUS.waiting);
  });

  it('should not display a hint when notification failed but no failure code is present', () => {
    render(
      <SigneeStateTag
        state={{
          name: null,
          organization: null,
          hasSigned: false,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Failed,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: null,
        }}
      />,
    );

    expect(screen.queryByText('signee_list.notification_failed_hint_configuration')).not.toBeInTheDocument();
    expect(screen.queryByText('signee_list.notification_failed_hint_rejected')).not.toBeInTheDocument();
  });

  it.each(['Configuration', 'ServiceOwnerUnavailable'] as const)(
    'should display the configuration hint when notificationFailure is %s',
    (notificationFailure) => {
      render(
        <SigneeStateTag
          state={{
            name: null,
            organization: null,
            hasSigned: false,
            delegationSuccessful: true,
            delegationFailure: undefined,
            notificationStatus: NotificationStatus.Failed,
            notificationFailure,
            partyId: 123,
            signedTime: null,
          }}
        />,
      );

      screen.getByText('signee_list.notification_failed_hint_configuration');
      expect(screen.queryByText('signee_list.notification_failed_hint_rejected')).not.toBeInTheDocument();
    },
  );

  it.each(['Rejected', 'Unknown'] as const)(
    'should display the rejected hint when notificationFailure is %s',
    (notificationFailure) => {
      render(
        <SigneeStateTag
          state={{
            name: null,
            organization: null,
            hasSigned: false,
            delegationSuccessful: true,
            delegationFailure: undefined,
            notificationStatus: NotificationStatus.Failed,
            notificationFailure,
            partyId: 123,
            signedTime: null,
          }}
        />,
      );

      screen.getByText('signee_list.notification_failed_hint_rejected');
      expect(screen.queryByText('signee_list.notification_failed_hint_configuration')).not.toBeInTheDocument();
    },
  );
});
