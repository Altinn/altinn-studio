import React, { useEffect } from 'react';
import { render as rtlRender, act, screen, waitFor } from '@testing-library/react';
import type { WindowWithQueryClient } from './AppContext';
import { AppContextProvider } from './AppContext';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from './hooks';

const org = 'org';
const app = 'app';
const mockSelectedFormLayoutSetName = 'test-layout-set';
const mockSelectedFormLayoutName = 'Side1';

const render = (ChildComponent: React.ElementType) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, mockSelectedFormLayoutSetName], {
    pages: {
      order: [mockSelectedFormLayoutName],
    },
  });
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <AppContextProvider>
          <ChildComponent />
        </AppContextProvider>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

describe('AppContext', () => {
  afterEach(jest.clearAllMocks);

  it('sets selectedFormLayoutSetName correctly', async () => {
    const user = userEvent.setup();

    render(() => {
      const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } = useAppContext();
      return (
        <>
          <button
            data-testid='button'
            onClick={() => setSelectedFormLayoutSetName(mockSelectedFormLayoutSetName)}
          />
          <div data-testid='selectedFormLayoutSetName'>{selectedFormLayoutSetName}</div>
        </>
      );
    });

    expect((await screen.findByTestId('selectedFormLayoutSetName')).textContent).toEqual('');

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutSetName')).textContent).toEqual(
        mockSelectedFormLayoutSetName,
      ),
    );
  });

  it('sets selectedFormLayoutName correctly', async () => {
    const user = userEvent.setup();

    render(() => {
      const { selectedFormLayoutName, setSelectedFormLayoutName } = useAppContext();
      return (
        <>
          <button
            data-testid='button'
            onClick={() => setSelectedFormLayoutName(mockSelectedFormLayoutName)}
          />
          <div data-testid='selectedFormLayoutName'>{selectedFormLayoutName}</div>
        </>
      );
    });

    expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual('');

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () =>
      expect((await screen.findByTestId('selectedFormLayoutName')).textContent).toEqual(
        mockSelectedFormLayoutName,
      ),
    );
  });

  it('refetches layouts correctly', async () => {
    const user = userEvent.setup();

    const queryClient = createQueryClientMock();
    queryClient.invalidateQueries = jest.fn();

    render(() => {
      const { previewIframeRef, refetchLayouts, selectedFormLayoutSetName } = useAppContext();
      useEffect(() => {
        if (previewIframeRef) {
          const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;
          contentWindow.queryClient = queryClient;
        }
      }, [previewIframeRef]);
      return (
        <>
          <button data-testid='button' onClick={() => refetchLayouts(selectedFormLayoutSetName)} />
          <iframe data-testid='previewIframeRef' ref={previewIframeRef} />
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['formLayouts', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('refetches layout settings correctly', async () => {
    const user = userEvent.setup();

    const queryClient = createQueryClientMock();
    queryClient.invalidateQueries = jest.fn();

    render(() => {
      const { previewIframeRef, refetchLayoutSettings, selectedFormLayoutSetName } =
        useAppContext();
      useEffect(() => {
        if (previewIframeRef) {
          const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;
          contentWindow.queryClient = queryClient;
        }
      }, [previewIframeRef]);
      return (
        <>
          <button
            data-testid='button'
            onClick={() => refetchLayoutSettings(selectedFormLayoutSetName)}
          />
          <iframe data-testid='previewIframeRef' ref={previewIframeRef} />
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['layoutSettings', mockSelectedFormLayoutSetName],
      }),
    );
  });

  it('refetches texts correctly', async () => {
    const user = userEvent.setup();

    const mockLanguage = 'nb';

    const queryClient = createQueryClientMock();
    queryClient.invalidateQueries = jest.fn();

    render(() => {
      const { previewIframeRef, refetchTexts } = useAppContext();
      useEffect(() => {
        if (previewIframeRef) {
          const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;
          contentWindow.queryClient = queryClient;
        }
      }, [previewIframeRef]);
      return (
        <>
          <button data-testid='button' onClick={() => refetchTexts(mockLanguage)} />
          <iframe data-testid='previewIframeRef' ref={previewIframeRef} />
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    await waitFor(async () =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['fetchTextResources', mockLanguage],
      }),
    );
  });
});
