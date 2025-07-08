import React from 'react';
import { useParams } from 'react-router-dom';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { randomUUID } from 'crypto';

import { useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { type fetchSigneeList, NotificationStatus, useSigneeList } from 'src/layout/SigneeList/api';
import { SigneeListComponent } from 'src/layout/SigneeList/SigneeListComponent';
import { SigneeListError } from 'src/layout/SigneeList/SigneeListError';
import { ProcessTaskType } from 'src/types';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

jest.mock('src/utils/layout/useNodeItem');
jest.mock('react-router-dom');
jest.mock('src/features/language/useLanguage');
jest.mock('src/features/language/Lang');
jest.mock('src/features/instance/useProcessQuery');
jest.mock('src/layout/SigneeList/api');
jest.mock('src/layout/SigneeList/SigneeListError');

const mockSigneeStates: Awaited<ReturnType<typeof fetchSigneeList>> = [
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

const mockedUseSigneeList = jest.mocked(useSigneeList);

describe('SigneeListComponent', () => {
  beforeEach(() => {
    // resets all mocked functions to jest.fn()
    jest.resetAllMocks();

    // eslint-disable-next-line react/jsx-no-useless-fragment
    jest.mocked(SigneeListError).mockImplementation(({ error }: { error: Error }) => <>{error.message}</>);

    jest.mocked(useTaskTypeFromBackend).mockReturnValue(ProcessTaskType.Signing);
    jest.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);
    jest.mocked(useLanguage).mockReturnValue({
      langAsString: (inputString: string) => inputString,
    } as unknown as ReturnType<typeof useLanguage>);
    jest.mocked(useParams).mockReturnValue({
      partyId: 'partyId',
      instanceGuid: randomUUID(),
    });
    jest.mocked(useItemWhenType).mockReturnValue({
      textResourceBindings: {
        title: 'Signee List',
        description: 'description',
        help: 'help',
      },
    } as ReturnType<typeof useItemWhenType>);
  });

  it('should render correctly', () => {
    mockedUseSigneeList.mockReturnValue({
      data: mockSigneeStates,
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useSigneeList>);

    render(
      <SigneeListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    screen.getByRole('table', { name: /Signee List/ });
    screen.getByRole('columnheader', { name: 'signee_list.header_name' });
    screen.getByRole('columnheader', { name: 'signee_list.header_on_behalf_of' });
    screen.getByRole('columnheader', { name: 'signee_list.header_status' });

    expect(screen.getAllByRole('row')).toHaveLength(5);

    screen.getByRole('row', { name: 'name organization signee_list.signee_status_signed' });
    screen.getByRole('row', { name: 'name2 organization2 signee_list.signee_status_delegation_failed' });
    screen.getByRole('row', { name: 'name3 organization3 signee_list.signee_status_notification_failed' });
    screen.getByRole('row', { name: 'name4 organization4 signee_list.signee_status_waiting' });
  });

  it('should render error message when API call fails', () => {
    mockedUseSigneeList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API error'),
    } as ReturnType<typeof useSigneeList>);

    render(
      <SigneeListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    screen.getByText('API error');
  });

  it('should render spinner when loading', () => {
    mockedUseSigneeList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useSigneeList>);

    render(
      <SigneeListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef()}
      />,
    );

    screen.getByRole('table', { name: /Signee List/ });
    screen.getByRole('columnheader', { name: 'signee_list.header_name' });
    screen.getByRole('columnheader', { name: 'signee_list.header_on_behalf_of' });
    screen.getByRole('columnheader', { name: 'signee_list.header_status' });
    screen.getByRole('cell', { name: /loading data.../i });

    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
