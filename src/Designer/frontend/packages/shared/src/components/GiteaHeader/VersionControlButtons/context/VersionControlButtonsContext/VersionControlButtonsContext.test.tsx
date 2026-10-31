import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  VersionControlButtonsContextProvider,
  type VersionControlButtonsContextProviderProps,
  useVersionControlButtonsContext,
} from './VersionControlButtonsContext';
import { repository } from 'app-shared/mocks/mocks';
import { mockRepoStatus } from '../../test/mocks/versionControlContextMock';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../mocks/renderWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { app, org } from '@studio/testing/testids';
import type { RepoStatus } from 'app-shared/types/RepoStatus';

const contextTestId: string = 'context';
const isLoadingTestId: string = 'isLoading';
const hasPushRightsTestId: string = 'hasPushRights';
const hasMergeConflictTestId: string = 'hasMergeConflict';
const repoStatusTestId: string = 'repoStatus';
const fetchResultTestId: string = 'fetchResult';
const shareButtonName: string = 'Share';
const fetchButtonName: string = 'Fetch';

const repoStatusWith = (repositoryStatus: string): RepoStatus => ({
  ...mockRepoStatus,
  repositoryStatus,
});

const nonFastForwardError = createApiErrorMock(409, 'GT_01');
const editorQueryKey = [QueryKey.TextResources, org, app];

describe('VersionControlButtonsContext', () => {
  it('should render children', () => {
    const buttonText: string = 'My button';
    renderVersionControlButtonsContextProvider({
      contextProviderProps: { children: <button>{buttonText}</button> },
    });

    expect(screen.getByRole('button', { name: buttonText })).toBeInTheDocument();
  });

  it('should provide a useVersionControlButtonsContext hook', () => {
    const ContextUser = () => {
      const {} = useVersionControlButtonsContext();
      return <div data-testid={contextTestId} />;
    };
    renderVersionControlButtonsContextProvider({
      contextProviderProps: { children: <ContextUser /> },
    });

    expect(screen.getByTestId(contextTestId)).toHaveTextContent('');
  });

  it('should throw an error when useVersionControlButtonsContext is used outside of a VersionControlButtonsContextProvider', () => {
    const ContextUser = () => {
      useVersionControlButtonsContext();
      return <div data-testid={contextTestId}>Test</div>;
    };

    expect(() => render(<ContextUser />)).toThrow(
      'useVersionControlButtonsContext must be used within a VersionControlButtonsContextProvider',
    );
  });

  it('should provide initial values to the context', () => {
    renderVersionControlButtonsContextProvider();

    expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    expect(screen.getByTestId(hasPushRightsTestId)).toHaveTextContent('true');
    expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
    expect(screen.getByTestId(repoStatusTestId)).toHaveTextContent(JSON.stringify(mockRepoStatus));
  });

  describe('commitAndPushChanges', () => {
    it('should set isLoading to true while sharing', async () => {
      const user = userEvent.setup();
      renderVersionControlButtonsContextProvider({
        queries: { commitAndPushChanges: vi.fn().mockReturnValue(new Promise(() => {})) },
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('true');
    });

    it('should confirm the share and refresh the editors when sharing succeeds', async () => {
      const user = userEvent.setup();
      const onPullSuccess = vi.fn();
      const queryClient = createQueryClientMock();
      queryClient.setQueryData(editorQueryKey, {});
      renderVersionControlButtonsContextProvider({
        contextProviderProps: { onPullSuccess },
        queries: { getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('Ok')) },
        queryClient,
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      expect(
        await screen.findByText(textMock('sync_header.sharing_changes_completed')),
      ).toBeInTheDocument();
      await waitFor(() => expect(onPullSuccess).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(queryClient.getQueryState(editorQueryKey)?.isInvalidated).toBe(true),
      );
    });

    it('should enter merge conflict mode when sharing is rejected and the pull finds conflicts', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const queryClient = createQueryClientMock();
      const pullResult = repoStatusWith('MergeConflict');
      renderVersionControlButtonsContextProvider({
        queries: {
          getRepoPull: vi.fn().mockResolvedValue(pullResult),
          commitAndPushChanges: vi.fn().mockRejectedValue(nonFastForwardError),
        },
        queryClient,
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      await waitFor(() =>
        expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('true'),
      );
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
      expect(
        screen.queryByText(textMock('sync_header.sharing_changes_rejected')),
      ).not.toBeInTheDocument();
      expect(queryClient.getQueryData([QueryKey.RepoStatus, org, app])).toEqual({
        ...pullResult,
        hasMergeConflict: true,
      });
    });

    it('should explain a checkout conflict when sharing is rejected and the pull is blocked', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      renderVersionControlButtonsContextProvider({
        queries: {
          getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('CheckoutConflict')),
          commitAndPushChanges: vi.fn().mockRejectedValue(nonFastForwardError),
        },
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      expect(
        await screen.findByText(textMock('sync_header.checkout_conflict_blocked_action')),
      ).toBeInTheDocument();
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
    });

    it('should say the share was rejected, without the default error, when the pull finds nothing to explain it', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const onPullSuccess = vi.fn();
      renderVersionControlButtonsContextProvider({
        contextProviderProps: { onPullSuccess },
        queries: {
          getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('Ok')),
          commitAndPushChanges: vi.fn().mockRejectedValue(nonFastForwardError),
        },
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      expect(
        await screen.findByText(textMock('sync_header.sharing_changes_rejected')),
      ).toBeInTheDocument();
      expect(screen.queryByText(textMock('api_errors.GT_01'))).not.toBeInTheDocument();
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
      expect(onPullSuccess).toHaveBeenCalledTimes(1);
    });

    it('should leave other share errors to the default error message', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      renderVersionControlButtonsContextProvider({
        queries: {
          getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('CheckoutConflict')),
          commitAndPushChanges: vi.fn().mockRejectedValue(createApiErrorMock(500)),
        },
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      await waitFor(() => expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false'));
      expect(
        screen.queryByText(textMock('sync_header.checkout_conflict_blocked_action')),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(textMock('sync_header.sharing_changes_rejected')),
      ).not.toBeInTheDocument();
    });

    it('should stop loading when sharing fails and the pull fails too', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      renderVersionControlButtonsContextProvider({
        queries: {
          getRepoPull: vi.fn().mockRejectedValue(createApiErrorMock(500)),
          commitAndPushChanges: vi.fn().mockRejectedValue(nonFastForwardError),
        },
      });

      await user.click(screen.getByRole('button', { name: shareButtonName }));

      await waitFor(() => expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false'));
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
      expect(
        screen.queryByText(textMock('sync_header.sharing_changes_rejected')),
      ).not.toBeInTheDocument();
    });
  });

  describe('fetchChanges', () => {
    it('should refresh the editors and report the app as up to date when the pull succeeds', async () => {
      const user = userEvent.setup();
      const onPullSuccess = vi.fn();
      const queryClient = createQueryClientMock();
      queryClient.setQueryData(editorQueryKey, {});
      renderVersionControlButtonsContextProvider({
        contextProviderProps: { onPullSuccess },
        queries: { getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('Ok')) },
        queryClient,
      });

      await user.click(screen.getByRole('button', { name: fetchButtonName }));

      await waitFor(() => expect(screen.getByTestId(fetchResultTestId)).toHaveTextContent('true'));
      expect(onPullSuccess).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryState(editorQueryKey)?.isInvalidated).toBe(true);
    });

    it('should enter merge conflict mode when the pull finds conflicts', async () => {
      const user = userEvent.setup();
      renderVersionControlButtonsContextProvider({
        queries: { getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('MergeConflict')) },
      });

      await user.click(screen.getByRole('button', { name: fetchButtonName }));

      await waitFor(() => expect(screen.getByTestId(fetchResultTestId)).toHaveTextContent('false'));
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('true');
    });

    it('should show one checkout conflict message however often the pull is blocked', async () => {
      const user = userEvent.setup();
      renderVersionControlButtonsContextProvider({
        queries: { getRepoPull: vi.fn().mockResolvedValue(repoStatusWith('CheckoutConflict')) },
      });

      await user.click(screen.getByRole('button', { name: fetchButtonName }));
      await user.click(screen.getByRole('button', { name: fetchButtonName }));

      await waitFor(() => expect(screen.getByTestId(fetchResultTestId)).toHaveTextContent('false'));
      expect(
        await screen.findAllByText(textMock('sync_header.checkout_conflict_blocked_action')),
      ).toHaveLength(1);
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
    });

    it('should not report the app as up to date when the pull fails', async () => {
      const user = userEvent.setup();
      const onPullSuccess = vi.fn();
      renderVersionControlButtonsContextProvider({
        contextProviderProps: { onPullSuccess },
        queries: { getRepoPull: vi.fn().mockRejectedValue(createApiErrorMock(500)) },
      });

      await user.click(screen.getByRole('button', { name: fetchButtonName }));

      await waitFor(() => expect(screen.getByTestId(fetchResultTestId)).toHaveTextContent('false'));
      expect(onPullSuccess).not.toHaveBeenCalled();
    });
  });
});

const TestComponent = () => {
  const {
    isLoading,
    hasPushRights,
    hasMergeConflict,
    repoStatus,
    commitAndPushChanges,
    fetchChanges,
  } = useVersionControlButtonsContext();
  const [fetchResult, setFetchResult] = useState<boolean>();

  return (
    <div>
      <button onClick={() => commitAndPushChanges('test message')}>{shareButtonName}</button>
      <button onClick={async () => setFetchResult(await fetchChanges())}>{fetchButtonName}</button>
      <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
      <div data-testid={hasPushRightsTestId}>{hasPushRights.toString()}</div>
      <div data-testid={hasMergeConflictTestId}>{hasMergeConflict.toString()}</div>
      <div data-testid={repoStatusTestId}>{JSON.stringify(repoStatus)}</div>
      <div data-testid={fetchResultTestId}>{String(fetchResult)}</div>
    </div>
  );
};

type Props = {
  queries: Partial<ServicesContextProps>;
  contextProviderProps: Partial<VersionControlButtonsContextProviderProps>;
  queryClient: ReturnType<typeof createQueryClientMock>;
};

const renderVersionControlButtonsContextProvider = (props: Partial<Props> = {}) => {
  const { contextProviderProps = {}, queries, queryClient } = props;
  const {
    currentRepo = { ...repository, permissions: { ...repository.permissions, push: true } },
    repoStatus = mockRepoStatus,
    children = <TestComponent />,
    onPullSuccess,
  } = contextProviderProps;

  return renderWithProviders(
    { ...queriesMock, ...queries },
    queryClient,
  )(
    <VersionControlButtonsContextProvider
      currentRepo={currentRepo}
      repoStatus={repoStatus}
      onPullSuccess={onPullSuccess}
    >
      {children}
    </VersionControlButtonsContextProvider>,
  );
};
