import React, { useEffect } from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { AppContextProps, WindowWithQueryClient } from './AppContext';
import { AppContextProvider } from './AppContext';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from './hooks';
import type { QueryClient } from '@tanstack/react-query';
import { layout1NameMock } from './testing/layoutMock';
import { layoutSet1NameMock } from './testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '@studio/testing/wrapper';

const mockSelectedFormLayoutSetName = layoutSet1NameMock;
const mockSelectedFormLayoutName = layout1NameMock;

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

const buttonTestId = 'button';
const Button = ({ onClick }: { onClick: () => void }) => (
  <button data-testid={buttonTestId} onClick={onClick} />
);
const clickButton = async () => {
  const user = userEvent.setup();
  const button = screen.getByTestId(buttonTestId);
  await user.click(button);
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
    queryClient,
    ...renderWithProviders(
      <AppContextProvider
        shouldReloadPreview={false}
        previewHasLoaded={jest.fn()}
        onLayoutSetNameChange={jest.fn()}
      >
        <TestComponent queryClient={queryClient}>
          {(appContext: AppContextProps) => children(appContext)}
        </TestComponent>
      </AppContextProvider>,
      { queryClient },
    ),
  };
};

describe('AppContext', () => {
  afterEach(jest.clearAllMocks);

  it('sets selectedFormLayoutSetName correctly', async () => {
    renderAppContext(
      ({ selectedFormLayoutSetName, setSelectedFormLayoutSetName }: AppContextProps) => (
        <>
          <Button onClick={() => setSelectedFormLayoutSetName(mockSelectedFormLayoutSetName)} />
          <div data-testid='selectedFormLayoutSetName'>{selectedFormLayoutSetName}</div>
        </>
      ),
    );

    await clickButton();

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutSetName')).textContent).toEqual(
        mockSelectedFormLayoutSetName,
      ),
    );
  });

  it('sets selectedFormLayoutName correctly', async () => {
    renderAppContext(({ selectedFormLayoutName, setSelectedFormLayoutName }: AppContextProps) => (
      <>
        <Button onClick={() => setSelectedFormLayoutName(mockSelectedFormLayoutName)} />
        <div data-testid='selectedFormLayoutName'>{selectedFormLayoutName}</div>
      </>
    ));

    expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual('');

    await clickButton();

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual(
        mockSelectedFormLayoutName,
      ),
    );
  });

  it('invalidates layout query', async () => {
    const { queryClient } = renderAppContext(
      ({ refetchLayouts, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => refetchLayouts(selectedFormLayoutSetName)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['formLayouts', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('resets layout query', async () => {
    const { queryClient } = renderAppContext(
      ({ refetchLayouts, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => refetchLayouts(selectedFormLayoutSetName, true)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['formLayouts', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates layout settings query', async () => {
    const { queryClient } = renderAppContext(
      ({ refetchLayoutSettings, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => refetchLayoutSettings(selectedFormLayoutSetName)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['layoutSettings', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('reset layout settings query', async () => {
    const { queryClient } = renderAppContext(
      ({ refetchLayoutSettings, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => refetchLayoutSettings(selectedFormLayoutSetName, true)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['layoutSettings', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates text query', async () => {
    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ refetchTexts }: AppContextProps) => (
      <Button onClick={() => refetchTexts(mockLanguage)} />
    ));

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['fetchTextResources', mockLanguage],
      }),
    );
  });

  it('resets text query', async () => {
    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ refetchTexts }: AppContextProps) => (
      <Button onClick={() => refetchTexts(mockLanguage, true)} />
    ));

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: ['fetchTextResources', mockLanguage],
      }),
    );
  });
});
