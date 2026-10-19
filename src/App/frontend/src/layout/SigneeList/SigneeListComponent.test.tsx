import React, { ReactElement } from 'react';
import { useParams } from 'react-router';

import { screen } from '@testing-library/dom';
import { act, render as renderRtl, RenderOptions } from '@testing-library/react';

import { apiClients } from 'src/core/api-client';
import { NotificationStatus } from 'src/core/queries/signeeList';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { SigneeListComponent } from 'src/layout/SigneeList/SigneeListComponent';
import { SigneeListError } from 'src/layout/SigneeList/SigneeListError';
import { apiMock } from 'src/test/apiMocks';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { SigneeState } from 'src/core/queries/signeeList';

let queryTest: ReturnType<typeof createQueryTestWrapper>;

vi.mock('src/utils/layout/hooks');
vi.mock('src/utils/layout/useEvalExpression', () => ({
  useEvalExpression: (value: unknown, descriptor: { defaultValue: unknown }) => value ?? descriptor.defaultValue,
  useEvalOptionalText: (value: unknown, descriptor: { defaultValue: unknown }) =>
    value === undefined ? undefined : (value ?? descriptor.defaultValue),
}));
vi.mock('src/utils/layout/DataModelLocation', () => ({
  useIndexedId: (baseId: string) => baseId,
}));
vi.mock('react-router');
vi.mock('src/features/language/useLanguage');
vi.mock('src/features/language/Lang');
vi.mock('src/layout/SigneeList/SigneeListError');

const mockSigneeStates: SigneeState[] = [
  {
    name: 'name',
    organization: 'organization',
    hasSigned: true,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId: 123,
    signedTime: new Date().toISOString(),
  },
  {
    name: 'name2',
    organization: 'organization2',
    hasSigned: false,
    delegationSuccessful: false,
    notificationStatus: NotificationStatus.Failed,
    partyId: 123,
    signedTime: null,
  },
  {
    name: 'name3',
    organization: 'organization3',
    hasSigned: false,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Failed,
    partyId: 123,
    signedTime: null,
  },
  {
    name: 'name4',
    organization: 'organization4',
    hasSigned: false,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.NotSent,
    partyId: 123,
    signedTime: null,
  },
];

describe('SigneeListComponent', () => {
  beforeEach(() => {
    // resets all mocked functions to vi.fn()
    vi.resetAllMocks();
    queryTest = createQueryTestWrapper();

    // eslint-disable-next-line react/jsx-no-useless-fragment
    vi.mocked(SigneeListError).mockImplementation(({ error }: { error: Error }) => <>{error.message}</>);

    vi.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);
    vi.mocked(useLanguage).mockReturnValue({
      langAsString: (inputString: string) => inputString,
    } as unknown as ReturnType<typeof useLanguage>);
    vi.mocked(useParams).mockReturnValue({
      instanceOwnerPartyId: 'partyId',
      instanceGuid: 'instanceGuid',
      taskId: 'taskId',
    });
    vi.mocked(useComponentConfig).mockReturnValue({
      textResourceBindings: {
        title: 'Signee List',
        description: 'description',
        help: 'help',
      },
    } as ReturnType<typeof useComponentConfig>);
  });

  it('should render correctly', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue(mockSigneeStates);

    await render(
      <SigneeListComponent
        baseComponentId='signee-list'
        containerDivRef={React.createRef()}
      />,
    );

    await screen.findByRole('row', { name: 'name organization signee_list.signee_status_signed' });
    screen.getByRole('heading', { name: /Signee List/ });
    screen.getByText('description');
    expect(screen.queryByRole('caption')).not.toBeInTheDocument();

    screen.getByRole('table', { name: /Signee List/ });
    expect(screen.getByTestId('signee-list')).toHaveAttribute('aria-label', 'Signee List');
    screen.getByRole('columnheader', { name: 'signee_list.header_name' });
    screen.getByRole('columnheader', { name: 'signee_list.header_on_behalf_of' });
    screen.getByRole('columnheader', { name: 'signee_list.header_status' });

    expect(screen.getAllByRole('row')).toHaveLength(5);

    screen.getByRole('row', { name: 'name organization signee_list.signee_status_signed' });
    screen.getByRole('row', { name: 'name2 organization2 signee_list.signee_status_delegation_failed' });
    screen.getByRole('row', { name: 'name3 organization3 signee_list.signee_status_notification_failed' });
    screen.getByRole('row', { name: 'name4 organization4 signee_list.signee_status_waiting' });
  });

  it('should render error message when API call fails', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockRejectedValue(new Error('API error'));

    await render(
      <SigneeListComponent
        baseComponentId='signee-list'
        containerDivRef={React.createRef()}
      />,
    );

    await screen.findByText('API error');
  });

  it('should render spinner when loading', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockImplementation(apiMock(apiClients.signingApi.fetchSigneeList));

    await render(
      <SigneeListComponent
        baseComponentId='signee-list'
        containerDivRef={React.createRef()}
      />,
    );

    screen.getByRole('table', { name: /Signee List/ });
    expect(screen.getByTestId('signee-list')).toHaveAttribute('aria-label', 'Signee List');
    screen.getByRole('columnheader', { name: 'signee_list.header_name' });
    screen.getByRole('columnheader', { name: 'signee_list.header_on_behalf_of' });
    screen.getByRole('columnheader', { name: 'signee_list.header_status' });
    screen.getByRole('cell', { name: /loading data.../i });

    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});

const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  act(async () => renderRtl(ui, { ...options, wrapper: queryTest.wrapper }));
