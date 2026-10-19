import React from 'react';
import { useParams } from 'react-router';

import { screen } from '@testing-library/dom';
import { act, render as renderRtl } from '@testing-library/react';

import { apiClients } from 'src/core/api-client';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { NotificationStatus, SigneeState } from 'src/core/queries/signeeList';
import { FormStore } from 'src/features/form/FormContext';
import { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { Lang } from 'src/features/language/Lang';
import { CompExternal } from 'src/layout/layout';
import { SigneeListSummary } from 'src/layout/SigneeList/SigneeListSummary';
import { apiMock } from 'src/test/apiMocks';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { ExprResolved } from 'src/features/expressions/types';

let queryTest: ReturnType<typeof createQueryTestWrapper>;

vi.mock('react-router');
vi.mock('src/utils/layout/hooks');
vi.mock('src/utils/layout/useEvalExpression', () => ({
  useEvalExpression: (value: unknown, descriptor: { defaultValue: unknown }) => value ?? descriptor.defaultValue,
  useEvalOptionalText: (value: unknown, descriptor: { defaultValue: unknown }) =>
    value === undefined ? undefined : (value ?? descriptor.defaultValue),
}));
vi.mock('src/features/language/Lang');
vi.mock('src/features/formBootstrap/FormBootstrap');
vi.mock('src/utils/layout/hidden');
vi.mock('src/core/contexts/TaskOverrides');

describe('SigneeListSummary', () => {
  const mockedUseLayoutLookups = vi.mocked(FormStore.bootstrap.useLayoutLookups);
  const mockedUseTaskOverrides = vi.mocked(useTaskOverrides);
  const mockedUseConfig = vi.mocked(useComponentConfig);
  const mockedUseConfigFor = vi.mocked(useComponentConfig);
  const mockedUseIsHidden = vi.mocked(useIsHidden);
  const mockedItem: ExprResolved<CompExternal<'SigneeList'>> = {
    id: 'mock-id',
    type: 'SigneeList',
    textResourceBindings: {
      title: 'title',
    },
  };

  function mockNodeItem(extras: Partial<ExprResolved<CompExternal<'SigneeList'>>> = {}) {
    mockedUseLayoutLookups.mockImplementation(
      () =>
        ({
          getComponent(id: string, type?: string) {
            if (id !== mockedItem.id || (type && type !== mockedItem.type)) {
              throw new Error('Component id in useLayoutLookups() is not the mocked one');
            }
            return mockedItem;
          },
        }) as LayoutLookups,
    );
    mockedUseConfig.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (baseComponentId, type): any => {
        if (baseComponentId !== mockedItem.id || (type && type !== mockedItem.type)) {
          throw new Error('Component id in useComponentConfig() is not the mocked one');
        }
        return { ...mockedItem, ...extras };
      },
    );
    mockedUseConfigFor.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (baseComponentId): any => {
        if (baseComponentId !== mockedItem.id) {
          throw new Error('Component id in useComponentConfig() is not the mocked one');
        }
        return { ...mockedItem, ...extras };
      },
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
    queryTest = createQueryTestWrapper();

    vi.mocked(useParams).mockReturnValue({
      instanceOwnerPartyId: 'instanceOwnerPartyId',
      instanceGuid: 'instanceGuid',
      taskId: 'taskId',
    });
    mockNodeItem();
    vi.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);
    vi.mocked(mockedUseIsHidden).mockReturnValue(false);
    mockedUseTaskOverrides.mockReturnValue({});
  });

  it('should render loading state', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockImplementation(apiMock(apiClients.signingApi.fetchSigneeList));

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    screen.getByText('signee_list_summary.loading');
  });

  it('should render error state', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockRejectedValue(new Error('error'));

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    await screen.findByText('signee_list_summary.error');
  });

  it('should render no signatures without instance parameters', async () => {
    vi.mocked(useParams).mockReturnValue({});

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    await screen.findByText('signee_list_summary.no_signatures');
  });

  it('should render no signatures state when loading is false, error is null and data is an empty array', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([]);

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    await screen.findByText('signee_list_summary.no_signatures');
  });

  it('should render signatures for only signed signee', async () => {
    const signedTime1 = new Date().toISOString();
    const signedTime2 = new Date().toISOString();

    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([
      {
        name: 'Signee 1',
        organization: null,
        partyId: 1,
        delegationSuccessful: true,
        notificationStatus: NotificationStatus.NotSent,
        signedTime: signedTime1,
        hasSigned: true,
      },
      {
        name: 'Signee 2',
        organization: "Signee 2's organization",
        partyId: 2,
        delegationSuccessful: true,
        notificationStatus: NotificationStatus.Sent,
        signedTime: signedTime2,
        hasSigned: true,
      },
      {
        name: 'Signee 3',
        organization: "Signee 3's organization",
        partyId: 3,
        delegationSuccessful: true,
        notificationStatus: NotificationStatus.Failed,
        signedTime: null,
        hasSigned: false,
      },
    ] satisfies SigneeState[]);

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    screen.getByText('title');
    await screen.findByText('Signee 1');
    screen.getByText("Signee 2, signee_list_summary.on_behalf_of Signee 2's organization");
    expect(screen.queryByText(/Signee 3/i)).not.toBeInTheDocument();
  });

  it('should render original title if summary override title is undefined', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([] satisfies SigneeState[]);

    mockNodeItem({ textResourceBindings: { title: 'originalTitle' } });

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    screen.getByText('originalTitle');
  });

  it('should not render title if originalTitle and overrideTitle are not set', async () => {
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([] satisfies SigneeState[]);

    mockNodeItem({ textResourceBindings: {} });

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion

    await screen.findByText('signee_list_summary.no_signatures');
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it.each([null, ''])(
    'should not render title if summary title override is null or empty string',
    async (titleOverride) => {
      queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([] satisfies SigneeState[]);

      // Test case
      await render(
        <SigneeListSummary
          titleOverride={titleOverride}
          targetBaseComponentId={mockedItem.id}
        />,
      );

      // Assertion

      await screen.findByText('signee_list_summary.no_signatures');
      expect(screen.queryByText('title')).not.toBeInTheDocument();
    },
  );

  it('should use taskId from TaskOverrides when available', async () => {
    mockedUseTaskOverrides.mockReturnValue({ taskId: 'overrideTaskId' });
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([]);

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(queryTest.apis.signingApi.fetchSigneeList).toHaveBeenCalledWith(
      'instanceOwnerPartyId',
      'instanceGuid',
      'overrideTaskId',
    );
  });

  it('should fall back to taskId from URL params when TaskOverrides is empty', async () => {
    mockedUseTaskOverrides.mockReturnValue({});
    queryTest.apis.signingApi.fetchSigneeList.mockResolvedValue([]);

    // Test case
    await render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(queryTest.apis.signingApi.fetchSigneeList).toHaveBeenCalledWith(
      'instanceOwnerPartyId',
      'instanceGuid',
      'taskId',
    );
  });
});

function render(ui: React.ReactNode) {
  return act(async () => renderRtl(ui, { wrapper: queryTest.wrapper }));
}
