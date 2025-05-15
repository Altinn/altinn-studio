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
import { layout1NameMock } from './testing/layoutMock';
import { layoutSet1NameMock } from './testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { AppsQueryKey } from 'app-shared/types/AppsQueryKey';

const mockSelectedFormLayoutSetName = layoutSet1NameMock;
const mockSelectedFormLayoutName = layout1NameMock;

const TestComponent = ({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: (appContext: Partial<AppContextProps>) => React.ReactNode;
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
  queryClient.setQueryData([QueryKey.Pages, org, app, mockSelectedFormLayoutSetName], {
    pages: [{ id: mockSelectedFormLayoutName }],
  });

  return {
    ...render(
      <MemoryRouter>
        <ServicesContextProvider {...queriesMock} client={queryClient}>
          <AppContextProvider
            shouldReloadPreview={false}
            previewHasLoaded={jest.fn()}
            onLayoutSetNameChange={jest.fn()}
          >
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

  it('invalidates layouts query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(
      ({ updateLayoutsForPreview, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => updateLayoutsForPreview(selectedFormLayoutSetName)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppLayouts, mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('resets layouts query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(
      ({ updateLayoutsForPreview, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => updateLayoutsForPreview(selectedFormLayoutSetName, true)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppLayouts, mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates layout sets query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(({ updateLayoutSetsForPreview }: AppContextProps) => (
      <Button onClick={() => updateLayoutSetsForPreview()} />
    ));

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppLayoutSets],
      }),
    );
  });

  it('invalidates layout settings query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(
      ({ updateLayoutSettingsForPreview, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => updateLayoutSettingsForPreview(selectedFormLayoutSetName)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppLayoutSettings, mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('reset layout settings query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(
      ({ updateLayoutSettingsForPreview, selectedFormLayoutSetName }: AppContextProps) => (
        <Button onClick={() => updateLayoutSettingsForPreview(selectedFormLayoutSetName, true)} />
      ),
    );

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppLayoutSettings, mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('invalidates text query for Apps in preview', async () => {
    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ updateTextsForPreview }: AppContextProps) => (
      <Button onClick={() => updateTextsForPreview(mockLanguage)} />
    ));

    await clickButton();

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppTextResources, mockLanguage],
      }),
    );
  });

  it('resets text query for Apps in preview', async () => {
    const mockLanguage = 'nb';

    const { queryClient } = renderAppContext(({ updateTextsForPreview }: AppContextProps) => (
      <Button onClick={() => updateTextsForPreview(mockLanguage, true)} />
    ));

    await clickButton();

    await waitFor(async () => expect(queryClient.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.resetQueries).toHaveBeenCalledWith({
        queryKey: [AppsQueryKey.AppTextResources, mockLanguage],
      }),
    );
  });
});
