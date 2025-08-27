import React from 'react';
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
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useVersionControlButtonsContext();
      return <div data-testid={contextTestId}>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useVersionControlButtonsContext must be used within a VersionControlButtonsContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
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
      expect(screen.getByTestId(isLoadingTestId)).toHaveTextContent('false');
    });
    await waitFor(() => {
      expect(screen.getByTestId(hasMergeConflictTestId)).toHaveTextContent('true');
    });
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
  contextProviderProps: Partial<VersionControlButtonsContextProviderProps>;
};

const renderVersionControlButtonsContextProvider = (props: Partial<Props> = {}) => {
  const { contextProviderProps, queries } = props;
  const {
    currentRepo = { ...repository, permissions: { ...repository.permissions, push: true } },
    repoStatus = mockRepoStatus,
    children,
  } = contextProviderProps;

  return renderWithProviders({ ...queriesMock, ...queries })(
    <VersionControlButtonsContextProvider currentRepo={currentRepo} repoStatus={repoStatus}>
      {children}
    </VersionControlButtonsContextProvider>,
  );
};
