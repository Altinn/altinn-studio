import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AppContextProps, WindowWithQueryClient } from './AppContext';
import { AppContextProvider } from './AppContext';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from './hooks';
import type { QueryClient } from '@tanstack/react-query';

const org = 'org';
const app = 'app';
const mockSelectedFormLayoutSetName = 'test-layout-set';
const mockSelectedFormLayoutName = 'Side1';

const TestComponent = ({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: (appContext: AppContextProps) => React.ReactNode;
}) => {
  const appContext = useAppContext();
  useEffect(() => {
    if (appContext.previewIframeRef) {
      const contentWindow: WindowWithQueryClient =
        appContext.previewIframeRef?.current?.contentWindow;
      contentWindow.queryClient = queryClient;
    }
  }, [appContext.previewIframeRef, queryClient]);
  return (
    <>
      {children(appContext)}
      <iframe data-testid='previewIframeRef' ref={appContext.previewIframeRef} />
    </>
  );
};

const renderAppContext = (children: (appContext: AppContextProps) => React.ReactNode) => {
  const queryClient = createQueryClientMock();
  queryClient.invalidateQueries = jest.fn();
  queryClient.resetQueries = jest.fn();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], {
    sets: [
      {
        id: mockSelectedFormLayoutSetName,
      },
    ],
  });
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, mockSelectedFormLayoutSetName], {
    pages: {
      order: [mockSelectedFormLayoutName],
    },
  });

  return {
    ...render(
      <MemoryRouter>
        <ServicesContextProvider {...queriesMock} client={queryClient}>
          <AppContextProvider>
            <TestComponent queryClient={queryClient}>
              {(appContext: AppContextProps) => children(appContext)}
            </TestComponent>
          </AppContextProvider>
        </ServicesContextProvider>
      </MemoryRouter>,
    ),
    queryClient,
  };
};

describe('AppContext', () => {
  afterEach(jest.clearAllMocks);

  it('sets selectedFormLayoutSetName correctly', async () => {
    const user = userEvent.setup();

    renderAppContext(
      ({ selectedFormLayoutSetName, setSelectedFormLayoutSetName }: AppContextProps) => (
        <>
          <button
            data-testid='button'
            onClick={() => setSelectedFormLayoutSetName(mockSelectedFormLayoutSetName)}
          />
          <div data-testid='selectedFormLayoutSetName'>{selectedFormLayoutSetName}</div>
        </>
      ),
    );

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutSetName')).textContent).toEqual(
        mockSelectedFormLayoutSetName,
      ),
    );
  });

  it('sets selectedFormLayoutName correctly', async () => {
    const user = userEvent.setup();

    renderAppContext(({ selectedFormLayoutName, setSelectedFormLayoutName }: AppContextProps) => (
      <>
        <button
          data-testid='button'
          onClick={() => setSelectedFormLayoutName(mockSelectedFormLayoutName)}
        />
        <div data-testid='selectedFormLayoutName'>{selectedFormLayoutName}</div>
      </>
    ));

    expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual('');

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual(
        mockSelectedFormLayoutName,
      ),
    );
  });

  it('invalidates layout query', async () => {
    const user = userEvent.setup();

    const { queryClient } = renderAppContext(
      ({ refetchLayouts, selectedFormLayoutSetName }: AppContextProps) => (
        <button data-testid='button' onClick={() => refetchLayouts(selectedFormLayoutSetName)} />
      ),
    );

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['formLayouts', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('resets layout query', async () => {
    const user = userEvent.setup();

    const { queryClient } = renderAppContext(
      ({ refetchLayouts, selectedFormLayoutSetName }: AppContextProps) => (
        <button
          data-testid='button'
          onClick={() => refetchLayouts(selectedFormLayoutSetName, true)}
        />
      ),
    );

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['formLayouts', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates layout settings query', async () => {
    const user = userEvent.setup();

    const { queryClient } = renderAppContext(
      ({ refetchLayoutSettings, selectedFormLayoutSetName }: AppContextProps) => (
        <button
          data-testid='button'
          onClick={() => refetchLayoutSettings(selectedFormLayoutSetName)}
        />
      ),
    );

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['layoutSettings', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('reset layout settings query', async () => {
    const user = userEvent.setup();

    const { queryClient } = renderAppContext(
      ({ refetchLayoutSettings, selectedFormLayoutSetName }: AppContextProps) => (
        <button
          data-testid='button'
          onClick={() => refetchLayoutSettings(selectedFormLayoutSetName, true)}
        />
      ),
    );

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['layoutSettings', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates text query', async () => {
    const user = userEvent.setup();

    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ refetchTexts }: AppContextProps) => (
      <button data-testid='button' onClick={() => refetchTexts(mockLanguage)} />
    ));

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['fetchTextResources', mockLanguage],
      }),
    );
  });

  it('resets text query', async () => {
    const user = userEvent.setup();

    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ refetchTexts }: AppContextProps) => (
      <button data-testid='button' onClick={() => refetchTexts(mockLanguage, true)} />
    ));

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['fetchTextResources', mockLanguage],
      }),
    );
  });
});
