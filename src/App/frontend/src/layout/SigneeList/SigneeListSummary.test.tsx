import React from 'react';
import { useParams } from 'react-router';

import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormStore } from 'src/features/form/FormContext';
import { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { Lang } from 'src/features/language/Lang';
import { CompInternal } from 'src/layout/layout';
import { NotificationStatus, SigneeState, useSigneeList } from 'src/layout/SigneeList/api';
import { SigneeListSummary } from 'src/layout/SigneeList/SigneeListSummary';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';

vi.mock('src/layout/SigneeList/api');
vi.mock('react-router');
vi.mock('src/utils/layout/useNodeItem');
vi.mock('src/features/language/Lang');
vi.mock('src/features/formBootstrap/FormBootstrap');
vi.mock('src/utils/layout/hidden');
vi.mock('src/core/contexts/TaskOverrides');

describe('SigneeListSummary', () => {
  const mockedUseSigneeList = vi.mocked(useSigneeList);
  const mockedUseLayoutLookups = vi.mocked(FormStore.bootstrap.useLayoutLookups);
  const mockedUseTaskOverrides = vi.mocked(useTaskOverrides);
  const mockedUseItemWhenType = vi.mocked(useItemWhenType);
  const mockedUseItemFor = vi.mocked(useItemFor);
  const mockedUseIsHidden = vi.mocked(useIsHidden);
  const mockedItem: CompInternal<'SigneeList'> = {
    id: 'mock-id',
    type: 'SigneeList',
    textResourceBindings: {
      title: 'title',
    },
  };

  function mockNodeItem(extras: Partial<CompInternal<'SigneeList'>> = {}) {
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
    mockedUseItemWhenType.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (baseComponentId, type): any => {
        if (baseComponentId !== mockedItem.id || type !== mockedItem.type) {
          throw new Error('Component id in useItemWhenType() is not the mocked one');
        }
        return { ...mockedItem, ...extras };
      },
    );
    mockedUseItemFor.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (baseComponentId): any => {
        if (baseComponentId !== mockedItem.id) {
          throw new Error('Component id in useItemWhenType() is not the mocked one');
        }
        return { ...mockedItem, ...extras };
      },
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();

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

  it('should render loading state', () => {
    mockedUseSigneeList.mockReturnValue({
      date: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.loading');
  });

  it('should render error state', () => {
    mockedUseSigneeList.mockReturnValue({
      date: undefined,
      isLoading: false,
      error: new Error('error'),
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.error');
  });

  it('should render no signatures state when loading is false, error is null and data is undefined', () => {
    mockedUseSigneeList.mockReturnValue({
      date: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.no_signatures');
  });

  it('should render no signatures state when loading is false, error is null and data is an empty array', () => {
    mockedUseSigneeList.mockReturnValue({
      date: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.no_signatures');
  });

  it('should render signatures for only signed signee', () => {
    const signedTime1 = new Date().toISOString();
    const signedTime2 = new Date().toISOString();

    mockedUseSigneeList.mockReturnValue({
      data: [
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
      ] satisfies SigneeState[],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('title');
    screen.getByText('Signee 1');
    screen.getByText("Signee 2, signee_list_summary.on_behalf_of Signee 2's organization");
    expect(screen.queryByText(/Signee 3/i)).not.toBeInTheDocument();
  });

  it('should render original title if summary override title is undefined', () => {
    mockedUseSigneeList.mockReturnValue({
      data: [] satisfies SigneeState[],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    mockNodeItem({ textResourceBindings: { title: 'originalTitle' } });

    // Test case
    render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('originalTitle');
  });

  it('should not render title if originalTitle and overrideTitle are not set', () => {
    mockedUseSigneeList.mockReturnValue({
      data: [] satisfies SigneeState[],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    mockNodeItem({ textResourceBindings: {} });

    // Test case
    render(
      <SigneeListSummary
        titleOverride={undefined}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.no_signatures');
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it.each([null, ''])('should not render title if summary title override is null or empty string', (titleOverride) => {
    mockedUseSigneeList.mockReturnValue({
      data: [] satisfies SigneeState[],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={titleOverride}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledTimes(1);
    screen.getByText('signee_list_summary.no_signatures');
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it('should use taskId from TaskOverrides when available', () => {
    mockedUseTaskOverrides.mockReturnValue({ taskId: 'overrideTaskId' });
    mockedUseSigneeList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledWith('instanceOwnerPartyId', 'instanceGuid', 'overrideTaskId');
  });

  it('should fall back to taskId from URL params when TaskOverrides is empty', () => {
    mockedUseTaskOverrides.mockReturnValue({});
    mockedUseSigneeList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSigneeList>);

    // Test case
    render(
      <SigneeListSummary
        titleOverride={null}
        targetBaseComponentId={mockedItem.id}
      />,
    );

    // Assertion
    expect(mockedUseSigneeList).toHaveBeenCalledWith('instanceOwnerPartyId', 'instanceGuid', 'taskId');
  });
});
