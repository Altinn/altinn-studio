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

const contextTestId: string = 'context';
const isLoadingTestId: string = 'isLoading';
const hasPushRightsTestId: string = 'hasPushRights';
const hasMergeConflictTestId: string = 'hasMergeConflict';
const repoStatusTestId: string = 'repoStatus';
const commitAndPushButtonTestId: string = 'commitAndPushButton';

describe('VersionControlButtonsContext', () => {
  afterEach(jest.clearAllMocks);

  it('should render children', () => {
    const buttonText: string = 'My button';
    renderVersionControlButtonsContextProvider({
      contextProviderProps: { children: <button>{buttonText}</button> },
    });

    expect(screen.getByRole('button', { name: buttonText })).toBeInTheDocument();
  });

  it('should provide a useVersionControlButtonsContext hook', () => {
    const TestComponent = () => {
      const {} = useVersionControlButtonsContext();
      return <div data-testid={contextTestId} />;
    };
    renderVersionControlButtonsContextProvider({
      contextProviderProps: { children: <TestComponent /> },
    });

    expect(screen.getByTestId(contextTestId)).toHaveTextContent('');
  });

  it('should throw an error when useVersionControlButtonsContext is used outside of a VersionControlButtonsContextProvider', () => {
    const TestComponent = () => {
      useVersionControlButtonsContext();
      return <div data-testid={contextTestId}>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useVersionControlButtonsContext must be used within a VersionControlButtonsContextProvider',
    );
  });

  it('should provide initial values to the context', () => {
    const TestComponent = () => {
      const { isLoading, hasPushRights, hasMergeConflict, repoStatus } =
        useVersionControlButtonsContext();

      return (
        <div>
          <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
          <div data-testid={hasPushRightsTestId}>{hasPushRights.toString()}</div>
          <div data-testid={hasMergeConflictTestId}>{hasMergeConflict.toString()}</div>
          <div data-testid={repoStatusTestId}>{JSON.stringify(repoStatus)}</div>
        </div>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
    });

    expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    expect(screen.getByTestId(hasPushRightsTestId)).toHaveTextContent('true');
    expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
    expect(screen.getByTestId(repoStatusTestId)).toHaveTextContent(JSON.stringify(mockRepoStatus));
  });

  it('should set isLoading to true when commitAndPushChanges is called', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { commitAndPushChanges, isLoading } = useVersionControlButtonsContext();

      return (
        <div>
          <button
            onClick={() => commitAndPushChanges('test message')}
            data-testid={commitAndPushButtonTestId}
          >
            Commit and Push
          </button>
          <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
        </div>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
    });

    const commitButton = screen.getByTestId(commitAndPushButtonTestId);
    await user.click(commitButton);

    await waitFor(() => {
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('true');
    });
  });

  it('should call toast.success when commitAndPushChanges completes successfully', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { commitAndPushChanges } = useVersionControlButtonsContext();

      return (
        <button
          onClick={() => commitAndPushChanges('test message')}
          data-testid={commitAndPushButtonTestId}
        >
          Commit and Push
        </button>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
      queries: {
        getRepoPull: jest.fn().mockReturnValue({ repositoryStatus: 'Ok' }),
      },
    });

    const commitButton = screen.getByTestId('commitAndPushButton');
    await user.click(commitButton);

    const successText = await waitFor(() =>
      screen.findByText(textMock('sync_header.sharing_changes_completed')),
    );
    expect(successText).toBeInTheDocument();
  });

  it('should handle errors during commit and push', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      const { commitAndPushChanges, isLoading, hasMergeConflict } =
        useVersionControlButtonsContext();

      return (
        <div>
          <button
            onClick={() => commitAndPushChanges('test message')}
            data-testid={commitAndPushButtonTestId}
          >
            Commit and Push
          </button>
          <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
          <div data-testid={hasMergeConflictTestId}>{hasMergeConflict.toString()}</div>
        </div>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
      queries: {
        getRepoPull: jest.fn().mockImplementation(() => ({
          hasMergeConflict: true,
          repositoryStatus: 'MergeConflict',
        })),
        commitAndPushChanges: jest.fn().mockRejectedValue(new Error('Test error')),
      },
    });

    const commitButton = screen.getByTestId(commitAndPushButtonTestId);
    await user.click(commitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Test error'));
    });
    await waitFor(() => {
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    });
    await waitFor(() => {
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('true');
    });
  });

  it('should show warning toast and keep merge conflict mode disabled on checkout conflict after commit and push error', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      const { commitAndPushChanges, isLoading, hasMergeConflict } =
        useVersionControlButtonsContext();

      return (
        <div>
          <button
            onClick={() => commitAndPushChanges('test message')}
            data-testid={commitAndPushButtonTestId}
          >
            Commit and Push
          </button>
          <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
          <div data-testid={hasMergeConflictTestId}>{hasMergeConflict.toString()}</div>
        </div>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
      queries: {
        getRepoPull: jest.fn().mockImplementation(() => ({
          repositoryStatus: 'CheckoutConflict',
        })),
        commitAndPushChanges: jest.fn().mockRejectedValue(new Error('Test error')),
      },
    });

    const commitButton = screen.getByTestId(commitAndPushButtonTestId);
    await user.click(commitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Test error'));
    });
    await waitFor(() => {
      expect(
        screen.getByText(textMock('sync_header.checkout_conflict_blocked_action')),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('false');
  });

  it('should enter merge conflict mode immediately when commit and push fails and follow-up pull reports merge conflict', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const queryClient = createQueryClientMock();
    const rebaseConflictError = createApiErrorMock(409, 'GT_01');

    const TestComponent = () => {
      const { commitAndPushChanges, isLoading, hasMergeConflict } =
        useVersionControlButtonsContext();

      return (
        <div>
          <button
            onClick={() => commitAndPushChanges('test message')}
            data-testid={commitAndPushButtonTestId}
          >
            Commit and Push
          </button>
          <div data-testid={isLoadingTestId}>{isLoading.toString()}</div>
          <div data-testid={hasMergeConflictTestId}>{hasMergeConflict.toString()}</div>
        </div>
      );
    };

    renderVersionControlButtonsContextProvider({
      contextProviderProps: {
        children: <TestComponent />,
      },
      queries: {
        getRepoPull: jest.fn().mockResolvedValue({ repositoryStatus: 'MergeConflict' }),
        commitAndPushChanges: jest.fn().mockRejectedValue(rebaseConflictError),
      },
      queryClient,
    });

    const commitButton = screen.getByTestId(commitAndPushButtonTestId);
    await user.click(commitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(rebaseConflictError);
    });
    await waitFor(() => {
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('true');
    });
    expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    expect(queryClient.getQueryData([QueryKey.RepoStatus, org, app])).toEqual({
      aheadBy: 0,
      behindBy: 0,
      contentStatus: [],
      hasMergeConflict: true,
      repositoryStatus: 'MergeConflict',
    });
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
  contextProviderProps: Partial<VersionControlButtonsContextProviderProps>;
  queryClient: ReturnType<typeof createQueryClientMock>;
};

const renderVersionControlButtonsContextProvider = (props: Partial<Props> = {}) => {
  const { contextProviderProps, queries, queryClient } = props;
  const {
    currentRepo = { ...repository, permissions: { ...repository.permissions, push: true } },
    repoStatus = mockRepoStatus,
    children,
  } = contextProviderProps;

  return renderWithProviders(
    { ...queriesMock, ...queries },
    queryClient,
  )(
    <VersionControlButtonsContextProvider currentRepo={currentRepo} repoStatus={repoStatus}>
      {children}
    </VersionControlButtonsContextProvider>,
  );
};
