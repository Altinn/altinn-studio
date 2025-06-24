import React from 'react';
import { useParams } from 'react-router-dom';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { randomUUID } from 'crypto';

import { useIsAuthorized } from 'src/features/instance/ProcessContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { NotificationStatus, SigneeState, useSigneeList } from 'src/layout/SigneeList/api';
import { useSignaturesValidation, useUserSigneeParties } from 'src/layout/SigningActions/api';
import { AwaitingCurrentUserSignaturePanel } from 'src/layout/SigningActions/PanelAwaitingCurrentUserSignature';
import { AwaitingOtherSignaturesPanel } from 'src/layout/SigningActions/PanelAwaitingOtherSignatures';
import { NoActionRequiredPanel } from 'src/layout/SigningActions/PanelNoActionRequired';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitPanel } from 'src/layout/SigningActions/PanelSubmit';
import { SigningActionsComponent } from 'src/layout/SigningActions/SigningActionsComponent';
import { CurrentUserStatus, getCurrentUserStatus } from 'src/layout/SigningActions/utils';
import { LayoutNode } from 'src/utils/layout/LayoutNode';

jest.mock('src/utils/layout/useNodeItem');
jest.mock('react-router-dom');
jest.mock('src/features/instance/useProcessNext.tsx');
jest.mock('src/core/contexts/AppQueriesProvider');
jest.mock('src/features/profile/ProfileProvider');
jest.mock('src/features/language/useLanguage');
jest.mock('src/features/language/Lang');
jest.mock('src/features/instance/ProcessContext');
jest.mock('src/features/validation/backendValidation/backendValidationQuery');
jest.mock('src/layout/SigneeList/api');
jest.mock('src/layout/SigningActions/api');
jest.mock('src/layout/SigningActions/utils');
jest.mock('@tanstack/react-query');

jest.mock('src/layout/SigningActions/PanelNoActionRequired');
jest.mock('src/layout/SigningActions/PanelAwaitingOtherSignatures');
jest.mock('src/layout/SigningActions/PanelAwaitingCurrentUserSignature');
jest.mock('src/layout/SigningActions/PanelSubmit');
jest.mock('src/layout/SigningActions/PanelSigning');

const mockedUseisAuthorized = jest.mocked(useIsAuthorized);
const mockedUseSigneeList = jest.mocked(useSigneeList);
const mockedUserSigneeParties = jest.mocked(useUserSigneeParties);
const mockedUseSignaturesValidation = jest.mocked(useSignaturesValidation);
const mockedGetCurrentUserStatus = jest.mocked(getCurrentUserStatus);

const failedDelegationSignee: SigneeState = {
  name: 'name2',
  organization: 'organization2',
  signedTime: null,
  hasSigned: false,
  delegationSuccessful: false,
  notificationStatus: NotificationStatus.NotSent,
  partyId: 123,
};

const failedNotificationSignee: SigneeState = {
  name: 'name3',
  organization: 'organization3',
  signedTime: null,
  hasSigned: false,
  delegationSuccessful: true,
  notificationStatus: NotificationStatus.Failed,
  partyId: 123,
};

describe('SigningActionsComponent', () => {
  const instanceGuid = randomUUID();
  const partyId = '123';
  const taskId = 'task_1';

  beforeEach(() => {
    // resets all mocked functions to jest.fn()
    jest.resetAllMocks();

    jest.mocked(useParams).mockReturnValue({
      partyId,
      instanceGuid,
      taskId,
    });
    jest.mocked(useIsAuthorized).mockReturnValue(() => true);

    jest.mocked(useLanguage).mockReturnValue({
      langAsString: (inputString: string) => inputString,
    } as unknown as ReturnType<typeof useLanguage>);
    jest.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);

    jest.mocked(useProfile).mockReturnValue({ partyId: 123 } as unknown as ReturnType<typeof useProfile>);

    mockedUseSigneeList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    mockedUseSignaturesValidation.mockReturnValue({
      refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
      hasMissingSignatures: false,
    });

    mockedUserSigneeParties.mockReturnValue([]);

    jest.mocked(AwaitingCurrentUserSignaturePanel).mockImplementation(({ hasMissingSignatures }) => (
      <div data-testid='awaiting-current-user-signature-panel'>
        <div data-testid={hasMissingSignatures ? 'missing-signatures' : 'no-missing-signatures'} />
      </div>
    ));

    jest.mocked(NoActionRequiredPanel).mockImplementation(({ hasSigned }) => (
      <div data-testid='no-action-required-panel'>
        <div data-testid={hasSigned ? 'has-signed' : 'has-not-signed'} />
      </div>
    ));

    jest.mocked(AwaitingOtherSignaturesPanel).mockImplementation(({ hasSigned }) => (
      <div data-testid='awaiting-other-signatures-panel'>
        <div data-testid={hasSigned ? 'has-signed' : 'has-not-signed'} />
      </div>
    ));

    jest.mocked(SubmitPanel).mockReturnValue(<div data-testid='submit-panel' />);

    jest
      .mocked(SigningPanel)
      .mockImplementation(({ heading, description, variant = 'info', actionButton, errorMessage, children }) => (
        <div
          data-testid='signing-panel'
          data-variant={variant}
        >
          <div data-testid='heading'>{heading}</div>
          {description && <div data-testid='description'>{description}</div>}
          {children}
          {actionButton && <div data-testid='action-button'>{actionButton}</div>}
          {errorMessage && <div data-testid='error-message'>{errorMessage}</div>}
        </div>
      ));
  });

  it('should render loading spinner when loading is true', () => {
    mockedUseSigneeList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByLabelText('signing.loading')).toBeInTheDocument();
  });

  it('should render ErrorPanel on API error', () => {
    mockedUseSigneeList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API error'),
    } as unknown as ReturnType<typeof useSigneeList>);

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByText('signing.api_error_panel_title')).toBeInTheDocument();
    expect(screen.getByText('signing.api_error_panel_description')).toBeInTheDocument();
  });

  it('should render ErrorPanel when any signee has delegation failed', () => {
    mockedUseSigneeList.mockReturnValue({
      data: [failedDelegationSignee, failedNotificationSignee],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useSigneeList>);

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByText('signing.delegation_error_panel_title')).toBeInTheDocument();
    expect(screen.getByText('signing.delegation_error_panel_description')).toBeInTheDocument();
  });

  it('should render AwaitingCurrentUserSignaturePanel with correct text when user is awaiting signature and there are missing signatures', () => {
    mockedGetCurrentUserStatus.mockReturnValue('awaitingSignature');
    mockedUseSignaturesValidation.mockReturnValue({
      refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
      hasMissingSignatures: true,
    });

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('awaiting-current-user-signature-panel')).toBeInTheDocument();
    expect(screen.getByTestId('missing-signatures')).toBeInTheDocument();
  });

  it('should render AwaitingCurrentUserSignaturePanel with correct text when user is awaiting signature and there are no missing signatures', () => {
    mockedGetCurrentUserStatus.mockReturnValue('awaitingSignature');
    mockedUseSignaturesValidation.mockReturnValue({
      refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
      hasMissingSignatures: false,
    });

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('awaiting-current-user-signature-panel')).toBeInTheDocument();
    expect(screen.getByTestId('no-missing-signatures')).toBeInTheDocument();
  });

  it('should render NoActionRequiredPanel with correct text when user does not have write access and has signed', () => {
    mockedGetCurrentUserStatus.mockReturnValue('signed');
    mockedUseisAuthorized.mockReturnValue(() => false);

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('no-action-required-panel')).toBeInTheDocument();
    expect(screen.getByTestId('has-signed')).toBeInTheDocument();
  });

  it('should render NoActionRequiredPanel with correct text when user does not have write access and is not signing', () => {
    mockedUseisAuthorized.mockReturnValue(() => false);
    mockedGetCurrentUserStatus.mockReturnValue('notSigning');

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('no-action-required-panel')).toBeInTheDocument();
    expect(screen.getByTestId('has-not-signed')).toBeInTheDocument();
  });

  it('should render AwaitingOtherSignaturesPanel with correct text when user has write access, has signed, and there are missing signatures', () => {
    mockedUseisAuthorized.mockReturnValue(() => true);
    mockedGetCurrentUserStatus.mockReturnValue('signed');
    mockedUseSignaturesValidation.mockReturnValue({
      refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
      hasMissingSignatures: true,
    });

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('awaiting-other-signatures-panel')).toBeInTheDocument();
    expect(screen.getByTestId('has-signed')).toBeInTheDocument();
  });

  it('should render AwaitingOtherSignaturesPanel with correct text when user has write access, is not signing, and there are missing signatures', () => {
    mockedUseisAuthorized.mockReturnValue(() => true);
    mockedGetCurrentUserStatus.mockReturnValue('notSigning');
    mockedUseSignaturesValidation.mockReturnValue({
      refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
      hasMissingSignatures: true,
    });

    render(
      <SigningActionsComponent
        node={{} as LayoutNode<'SigningActions'>}
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByTestId('awaiting-other-signatures-panel')).toBeInTheDocument();
    expect(screen.getByTestId('has-not-signed')).toBeInTheDocument();
  });

  it.each<Extract<CurrentUserStatus, 'notSigning' | 'signed'>>(['notSigning', 'signed'])(
    'should render SubmitPanel when user has write access and there are no missing signatures',
    (currentUserStatus) => {
      mockedUseisAuthorized.mockReturnValue(() => true);
      mockedGetCurrentUserStatus.mockReturnValue(currentUserStatus);
      mockedUseSignaturesValidation.mockReturnValue({
        refetchValidations: jest.fn() as unknown as ReturnType<typeof useSignaturesValidation>['refetchValidations'],
        hasMissingSignatures: false,
      });

      render(
        <SigningActionsComponent
          node={{} as LayoutNode<'SigningActions'>}
          containerDivRef={React.createRef()}
        />,
      );

      expect(screen.getByTestId('submit-panel')).toBeInTheDocument();
    },
  );
});
