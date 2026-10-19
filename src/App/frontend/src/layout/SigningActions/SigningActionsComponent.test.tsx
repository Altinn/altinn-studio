import React, { ReactElement } from 'react';

import { screen } from '@testing-library/dom';
import { act, render as renderRtl, RenderOptions } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { apiClients } from 'src/core/api-client';
import { NotificationStatus, SigneeState } from 'src/core/queries/signeeList';
import { Lang } from 'src/features/language/Lang';
import { CurrentLanguageProvider } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { AwaitingCurrentUserSignaturePanel } from 'src/layout/SigningActions/PanelAwaitingCurrentUserSignature';
import { AwaitingOtherSignaturesPanel } from 'src/layout/SigningActions/PanelAwaitingOtherSignatures';
import { NoActionRequiredPanel } from 'src/layout/SigningActions/PanelNoActionRequired';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitPanel } from 'src/layout/SigningActions/PanelSubmit';
import { SigningActionsComponent } from 'src/layout/SigningActions/SigningActionsComponent';
import { CurrentUserStatus, getCurrentUserStatus } from 'src/layout/SigningActions/utils';
import { apiMock } from 'src/test/apiMocks';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';

let queryTest: ReturnType<typeof createQueryTestWrapper>;

const randomUUID = () => '00000000-0000-4000-8000-000000000000';

vi.mock('src/utils/layout/useFormData');

vi.mock('src/features/profile/ProfileProvider');
vi.mock('src/features/language/useLanguage');
vi.mock('src/features/language/Lang');

vi.mock('src/layout/SigningActions/utils');

vi.mock('src/layout/SigningActions/PanelNoActionRequired');
vi.mock('src/layout/SigningActions/PanelAwaitingOtherSignatures');
vi.mock('src/layout/SigningActions/PanelAwaitingCurrentUserSignature');
vi.mock('src/layout/SigningActions/PanelSubmit');
vi.mock('src/layout/SigningActions/PanelSigning');

const mockedGetCurrentUserStatus = vi.mocked(getCurrentUserStatus);

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
    // resets all mocked functions to vi.fn()
    vi.resetAllMocks();
    queryTest = createQueryTestWrapper({}, `/instance/${partyId}/${instanceGuid}/${taskId}`);

    queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(true));

    vi.mocked(useLanguage).mockReturnValue({
      langAsString: (inputString: string) => inputString,
    } as unknown as ReturnType<typeof useLanguage>);
    vi.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);

    vi.mocked(useProfile).mockReturnValue(getProfileMock());

    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([]);

    queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([]);

    vi.mocked(AwaitingCurrentUserSignaturePanel).mockImplementation(({ hasMissingSignatures }) => (
      <div data-testid='awaiting-current-user-signature-panel'>
        <div data-testid={hasMissingSignatures ? 'missing-signatures' : 'no-missing-signatures'} />
      </div>
    ));

    vi.mocked(NoActionRequiredPanel).mockImplementation(({ hasSigned }) => (
      <div data-testid='no-action-required-panel'>
        <div data-testid={hasSigned ? 'has-signed' : 'has-not-signed'} />
      </div>
    ));

    vi.mocked(AwaitingOtherSignaturesPanel).mockImplementation(({ hasSigned }) => (
      <div data-testid='awaiting-other-signatures-panel'>
        <div data-testid={hasSigned ? 'has-signed' : 'has-not-signed'} />
      </div>
    ));

    vi.mocked(SubmitPanel).mockReturnValue(<div data-testid='submit-panel' />);

    vi.mocked(SigningPanel).mockImplementation(
      ({ heading, description, variant = 'info', actionButton, errorMessage, children }) => (
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
      ),
    );
  });

  it('should render loading spinner when loading is true', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockImplementation(apiMock(apiClients.signingApi.fetchSigneeList));

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(screen.getByLabelText('signing.loading')).toBeInTheDocument();
  });

  it('should render ErrorPanel on API error', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockRejectedValue(new Error('API error'));

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByText('signing.api_error_panel_title')).toBeInTheDocument();
    expect(await screen.findByText('signing.api_error_panel_description')).toBeInTheDocument();
  });

  it('should render ErrorPanel when any signee has delegation failed', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([failedDelegationSignee, failedNotificationSignee]);

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByText('signing.delegation_error_panel_title')).toBeInTheDocument();
    expect(await screen.findByText('signing.delegation_error_panel_description')).toBeInTheDocument();
  });

  it('should render AwaitingCurrentUserSignaturePanel with correct text when user is awaiting signature and there are missing signatures', async () => {
    mockedGetCurrentUserStatus.mockReturnValue('awaitingSignature');
    queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([
      { code: 'MissingSignatures', source: 'test', severity: 1, dataElementId: 'data' },
    ]);

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('awaiting-current-user-signature-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('missing-signatures')).toBeInTheDocument();
  });

  it('should render AwaitingCurrentUserSignaturePanel with correct text when user is awaiting signature and there are no missing signatures', async () => {
    mockedGetCurrentUserStatus.mockReturnValue('awaitingSignature');
    queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([]);

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('awaiting-current-user-signature-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('no-missing-signatures')).toBeInTheDocument();
  });

  it('should render NoActionRequiredPanel with correct text when user does not have write access and has signed', async () => {
    mockedGetCurrentUserStatus.mockReturnValue('signed');
    queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(false));

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('no-action-required-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('has-signed')).toBeInTheDocument();
  });

  it('should render NoActionRequiredPanel with correct text when user does not have write access and is not signing', async () => {
    queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(false));
    mockedGetCurrentUserStatus.mockReturnValue('notSigning');

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('no-action-required-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('has-not-signed')).toBeInTheDocument();
  });

  it('should render AwaitingOtherSignaturesPanel with correct text when user has write access, has signed, and there are missing signatures', async () => {
    queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(true));
    mockedGetCurrentUserStatus.mockReturnValue('signed');
    queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([
      { code: 'MissingSignatures', source: 'test', severity: 1, dataElementId: 'data' },
    ]);

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('awaiting-other-signatures-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('has-signed')).toBeInTheDocument();
  });

  it('should render AwaitingOtherSignaturesPanel with correct text when user has write access, is not signing, and there are missing signatures', async () => {
    queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(true));
    mockedGetCurrentUserStatus.mockReturnValue('notSigning');
    queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([
      { code: 'MissingSignatures', source: 'test', severity: 1, dataElementId: 'data' },
    ]);

    await render(
      <SigningActionsComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    expect(await screen.findByTestId('awaiting-other-signatures-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('has-not-signed')).toBeInTheDocument();
  });

  it.each<Extract<CurrentUserStatus, 'notSigning' | 'signed'>>(['notSigning', 'signed'])(
    'should render SubmitPanel when user has write access and there are no missing signatures',
    async (currentUserStatus) => {
      queryTest.apis.instanceApi.getInstance.mockResolvedValue(authorizedInstance(true));
      mockedGetCurrentUserStatus.mockReturnValue(currentUserStatus);
      queryTest.apis.backendValidationApi.fetchBackendValidations.mockResolvedValue([]);

      await render(
        <SigningActionsComponent
          baseComponentId='whatever'
          containerDivRef={React.createRef()}
        />,
      );

      expect(await screen.findByTestId('submit-panel')).toBeInTheDocument();
    },
  );
});

const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  act(async () =>
    renderRtl(<CurrentLanguageProvider>{ui}</CurrentLanguageProvider>, { ...options, wrapper: queryTest.wrapper }),
  );

function authorizedInstance(authorized: boolean) {
  const instance = getInstanceWithProcessMock();
  instance.process.currentTask!.userActions = [
    { id: 'sign', authorized, type: 'ProcessAction' },
    { id: 'write', authorized, type: 'ProcessAction' },
  ];
  return instance;
}
