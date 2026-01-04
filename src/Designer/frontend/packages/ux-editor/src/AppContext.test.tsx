import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AppContextProps, SelectedItem, WindowWithQueryClient } from './AppContext';
import { AppContextProvider } from './AppContext';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from './hooks';
import type { QueryClient } from '@tanstack/react-query';
import { layout1NameMock } from './testing/layoutMock';
import { app, layoutSet, org } from '@studio/testing/testids';
import { AppsQueryKey } from 'app-shared/types/AppsQueryKey';
import { AppRouter } from './testing/mocks';
import { useSearchParams } from 'react-router-dom';
import { ItemType } from './components/Properties/ItemType';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as unknown as jest.Mock;

const mockSelectedFormLayoutSetName = layoutSet;
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

const ItemSelector = ({
  setSelectedItem,
  selectedItem,
  type,
  id,
}: {
  setSelectedItem: AppContextProps['setSelectedItem'];
  selectedItem: SelectedItem | null;
  type: ItemType.Component | ItemType.Page;
  id: string;
}) => (
  <>
    <Button
      onClick={() =>
        setSelectedItem({
          type,
          id,
        } as SelectedItem)
      }
    />
    <div data-testid='selectedItemId'>{selectedItem ? String(selectedItem.id) : ''}</div>
  </>
);

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
      <AppRouter params={{ org, app, layoutSet }}>
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
      </AppRouter>,
    ),
    queryClient,
  };
};

describe('AppContext', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
  });

  afterEach(jest.clearAllMocks);

  it('sets selectedFormLayoutName correctly', async () => {
    const setSearchParamsMock = jest.fn();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), setSearchParamsMock]);
    renderAppContext(({ selectedFormLayoutName, setSelectedFormLayoutName }: AppContextProps) => (
      <>
        <Button onClick={() => setSelectedFormLayoutName(mockSelectedFormLayoutName)} />
        <div data-testid='selectedFormLayoutName'>{selectedFormLayoutName}</div>
      </>
    ));
    await clickButton();
    await waitFor(() => expect(setSearchParamsMock).toHaveBeenCalledTimes(1));
  });

  it('initializes selectedItem from layout query parameter', async () => {
    const layoutFromUrl = 'Side1';
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(`layout=${layoutFromUrl}`),
      jest.fn(),
    ]);
    renderAppContext(({ selectedItem }: AppContextProps) => (
      <div data-testid='selectedItemId'>{selectedItem ? selectedItem.id : ''}</div>
    ));
    await waitFor(async () =>
      expect((await screen.findByTestId('selectedItemId')).textContent).toEqual(layoutFromUrl),
    );
  });

  it('setSelectedItem updates selectedItem at runtime', async () => {
    const layoutFromUrl = 'Side1';
    const componentId = 'component-1';
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(`layout=${layoutFromUrl}`),
      jest.fn(),
    ]);
    renderAppContext(({ selectedItem, setSelectedItem }: AppContextProps) => (
      <ItemSelector
        setSelectedItem={setSelectedItem}
        selectedItem={selectedItem}
        type={ItemType.Component}
        id={componentId}
      />
    ));
    expect((await screen.findByTestId('selectedItemId')).textContent).toEqual(layoutFromUrl);
    await clickButton();
    await waitFor(async () =>
      expect((await screen.findByTestId('selectedItemId')).textContent).toEqual(componentId),
    );
  });

  it('initializes selectedItem as null when no layout query parameter is set', async () => {
    const pageId = 'override-page';
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    renderAppContext(({ selectedItem, setSelectedItem }: AppContextProps) => (
      <ItemSelector
        setSelectedItem={setSelectedItem}
        selectedItem={selectedItem}
        type={ItemType.Page}
        id={pageId}
      />
    ));
    expect((await screen.findByTestId('selectedItemId')).textContent).toEqual('');
    await clickButton();
    await waitFor(async () =>
      expect((await screen.findByTestId('selectedItemId')).textContent).toEqual(pageId),
    );
  });

  it('resets layouts query for Apps in preview', async () => {
    const { queryClient } = renderAppContext(({ updateLayoutsForPreview }: AppContextProps) => (
      <Button onClick={() => updateLayoutsForPreview(layoutSet, true)} />
    ));

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
      ({ updateLayoutSettingsForPreview }: AppContextProps) => (
        <Button onClick={() => updateLayoutSettingsForPreview(layoutSet)} />
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
      ({ updateLayoutSettingsForPreview }: AppContextProps) => (
        <Button onClick={() => updateLayoutSettingsForPreview(layoutSet, true)} />
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
