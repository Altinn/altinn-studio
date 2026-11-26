import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AppContextProps } from './AppContext';
import { AppContextProvider } from './AppContext';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from './hooks';
import { layout1NameMock } from './testing/layoutMock';
import { app, layoutSet, org } from '@designer/testing/testids';
import { PreviewContext, type PreviewContextProps } from 'app-shared/contexts/PreviewContext';
import { AppRouter } from './testing/mocks';

const mockSelectedFormLayoutSetName = layoutSet;
const mockSelectedFormLayoutName = layout1NameMock;

const TestComponent = ({
  children,
}: {
  children: (appContext: Partial<AppContextProps>) => React.ReactNode;
}) => {
  const appContext = useAppContext();
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
  const doReloadPreview = vi.fn();
  const previewContextValue: PreviewContextProps = {
    shouldReloadPreview: false,
    doReloadPreview,
    previewHasLoaded: vi.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.LayoutSets, org, app],
    [
      {
        id: mockSelectedFormLayoutSetName,
      },
    ],
  );
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
          <PreviewContext.Provider value={previewContextValue}>
            <AppContextProvider
              shouldReloadPreview={false}
              previewHasLoaded={vi.fn()}
              onLayoutSetNameChange={vi.fn()}
            >
              <TestComponent>{(appContext: AppContextProps) => children(appContext)}</TestComponent>
            </AppContextProvider>
          </PreviewContext.Provider>
        </ServicesContextProvider>
      </AppRouter>,
    ),
    queryClient,
    doReloadPreview,
  };
};

describe('AppContext', () => {
  it('sets selectedFormLayoutName correctly', async () => {
    renderAppContext(({ selectedFormLayoutName, setSelectedFormLayoutName }: AppContextProps) => (
      <>
        <Button onClick={() => setSelectedFormLayoutName(mockSelectedFormLayoutName)} />
        <div data-testid='selectedFormLayoutName'>{selectedFormLayoutName}</div>
      </>
    ));

    expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual('');

    await clickButton();

    await waitFor(() =>
      expect(screen.getByTestId('selectedFormLayoutName').textContent).toEqual(
        mockSelectedFormLayoutName,
      ),
    );
  });

  describe('when the Studio bridge in the frame is ready', () => {
    const previewOrigin = 'https://preview.test';
    const frameWindow = (): Window =>
      (screen.getByTestId('previewIframeRef') as HTMLIFrameElement).contentWindow;

    it.each([
      [
        'layoutsChanged',
        ({ updateLayoutsForPreview }: AppContextProps) => updateLayoutsForPreview(layoutSet),
      ],
      [
        'layoutSettingsChanged',
        ({ updateLayoutSettingsForPreview }: AppContextProps) =>
          updateLayoutSettingsForPreview(layoutSet),
      ],
      ['textsChanged', ({ updateTextsForPreview }: AppContextProps) => updateTextsForPreview('nb')],
    ])('tells it about %s, in place of reloading the frame', async (type, update) => {
      const { doReloadPreview } = renderAppContext((appContext: AppContextProps) => (
        <Button
          onClick={() => {
            appContext.previewBridgeOriginRef.current = previewOrigin;
            update(appContext);
          }}
        />
      ));
      const postMessage = vi.spyOn(frameWindow(), 'postMessage');
      await clickButton();
      expect(postMessage).toHaveBeenCalledWith(
        { type, source: 'altinn-studio', version: 1 },
        previewOrigin,
      );
      expect(doReloadPreview).not.toHaveBeenCalled();
    });

    it('reloads the frame when the change replaces what the frontend has, or the layout sets changed', async () => {
      const { doReloadPreview } = renderAppContext((appContext: AppContextProps) => (
        <Button
          onClick={() => {
            appContext.previewBridgeOriginRef.current = previewOrigin;
            appContext.updateLayoutsForPreview(layoutSet, true);
            appContext.updateLayoutSetsForPreview();
          }}
        />
      ));
      const postMessage = vi.spyOn(frameWindow(), 'postMessage');
      await clickButton();
      expect(postMessage).not.toHaveBeenCalled();
      await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(2));
    });
  });

  it('reloads the frame when its page has no ready bridge', async () => {
    const { doReloadPreview } = renderAppContext(({ updateLayoutsForPreview }: AppContextProps) => (
      <Button onClick={() => updateLayoutsForPreview(layoutSet)} />
    ));
    await clickButton();
    await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
  });
});
