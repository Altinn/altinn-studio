import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import type { ProcessState } from 'app-shared/types/api/ProcessState';
import type { Rect } from 'diagram-js/lib/util/Types';

const initialState: ProcessState = { bpmnXml: '<initial />', version: 'initial-version' };
const mockCommandStack = { readOnly: false };
type ModelerElement = { id: string };
const mockSelection = {
  get: jest.fn<ModelerElement[], []>().mockReturnValue([]),
  select: jest.fn<void, [ModelerElement]>(),
};
const mockElementRegistry = { get: jest.fn<ModelerElement | undefined, [string]>() };
const mockCanvas = { viewbox: jest.fn<Rect | undefined, [box?: Rect]>() };
const mockModelerServices = {
  commandStack: mockCommandStack,
  selection: mockSelection,
  elementRegistry: mockElementRegistry,
  canvas: mockCanvas,
};
const mockModeler = {
  get: jest.fn((service: keyof typeof mockModelerServices) => mockModelerServices[service]),
  importXML: jest.fn().mockResolvedValue(undefined),
};

jest.mock('./components/Canvas', () => ({
  Canvas: () => {
    const { useEffect } = jest.requireActual('react');
    const { useBpmnContext } = jest.requireActual('./contexts/BpmnContext');
    const { modelerRef } = useBpmnContext();
    useEffect(() => {
      modelerRef.current = mockModeler;
    }, [modelerRef]);
    return <div />;
  },
}));

const mockBpmnApiContextProps = jest.fn();
jest.mock('./contexts/BpmnApiContext', () => {
  const actual = jest.requireActual('./contexts/BpmnApiContext');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    BpmnApiContextProvider: (props: BpmnApiContextProps) => {
      mockBpmnApiContextProps(props);
      return createElement(actual.BpmnApiContextProvider, props);
    },
  };
});

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommandStack.readOnly = false;
    mockSelection.get.mockReset().mockReturnValue([]);
    mockElementRegistry.get.mockReset().mockReturnValue(undefined);
    mockCanvas.viewbox.mockReset().mockReturnValue(undefined);
    mockModeler.importXML.mockReset().mockResolvedValue(undefined);
  });

  it('shows a spinner while loading application metadata', () => {
    renderProcessEditor({ loadMetadata: false });
    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('shows an error when the process cannot be loaded', async () => {
    const getProcessState = jest.fn().mockRejectedValue(new Error('Cannot load the process'));
    renderProcessEditor({ state: null, queries: { getProcessState } });
    expect(
      await screen.findByRole('heading', {
        name: textMock('process_editor.fetch_bpmn_error_title'),
      }),
    ).toBeInTheDocument();
    expect(getProcessState).toHaveBeenCalledTimes(1);
  });

  it('shows the configuration panel when the process has loaded', () => {
    renderProcessEditor();
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_no_task_title'),
      }),
    ).toBeInTheDocument();
  });

  it('keeps editing blocked until a lost save is retried successfully', async () => {
    const user = userEvent.setup();
    const retrySave = deferred<ProcessState>();
    const updateProcessState = jest
      .fn()
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockReturnValueOnce(retrySave.promise);
    const getProcessState = jest.fn();
    renderProcessEditor({ queries: { updateProcessState, getProcessState } });
    act(() => currentApi().saveBpmn(Promise.resolve('<edited />')));
    const retry = await screen.findByRole('button', {
      name: textMock('process_editor.retry_save'),
    });
    expect(screen.getByRole('alert')).toHaveTextContent(textMock('process_editor.save_failed'));
    expect(
      screen.getByRole('button', { name: textMock('process_editor.discard_changes') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeDisabled();
    expect(mockCommandStack.readOnly).toBe(true);

    await user.click(retry);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(updateProcessState.mock.calls[1][2]).toEqual(updateProcessState.mock.calls[0][2]);
    expect(screen.getByRole('group')).toBeDisabled();
    expect(mockCommandStack.readOnly).toBe(true);

    await act(async () => retrySave.resolve({ bpmnXml: '<edited />', version: 'next-version' }));
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(screen.getByRole('group')).not.toBeDisabled();
    expect(getProcessState).not.toHaveBeenCalled();
    expect(mockModeler.importXML).not.toHaveBeenCalled();
  });

  it('discards a lost edit by reloading the saved process', async () => {
    const user = userEvent.setup();
    const currentState: ProcessState = { bpmnXml: '<current />', version: 'current-version' };
    const updateProcessState = jest.fn().mockRejectedValueOnce(new Error('Response lost'));
    const getProcessState = jest.fn().mockResolvedValue(currentState);
    renderProcessEditor({ queries: { updateProcessState, getProcessState } });
    act(() => currentApi().saveBpmn(Promise.resolve('<edited />')));

    await user.click(
      await screen.findByRole('button', { name: textMock('process_editor.discard_changes') }),
    );

    await waitFor(() => expect(mockModeler.importXML).toHaveBeenCalledWith(currentState.bpmnXml));
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(updateProcessState).toHaveBeenCalledTimes(1);
  });

  it('requires discard after rejection and uses the loaded version for the next save', async () => {
    const user = userEvent.setup();
    const currentState: ProcessState = { bpmnXml: '<current />', version: 'current-version' };
    const updateProcessState = jest
      .fn()
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } })
      .mockResolvedValue({ bpmnXml: '<next edit />', version: 'next-version' });
    const getProcessState = jest.fn().mockResolvedValue(currentState);
    renderProcessEditor({ queries: { updateProcessState, getProcessState } });

    act(() => currentApi().saveBpmn(Promise.resolve('<invalid edit />')));

    const discard = await screen.findByRole('button', {
      name: textMock('process_editor.discard_changes'),
    });
    expect(screen.getByRole('alert')).toHaveTextContent(textMock('process_editor.save_rejected'));
    expect(screen.getByRole('group')).toBeDisabled();
    expect(mockCommandStack.readOnly).toBe(true);
    expect(getProcessState).not.toHaveBeenCalled();
    expect(mockModeler.importXML).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: textMock('process_editor.retry_save') }),
    ).not.toBeInTheDocument();

    await user.click(discard);
    await waitFor(() => expect(mockModeler.importXML).toHaveBeenCalledWith(currentState.bpmnXml));
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('group')).not.toBeDisabled();

    act(() => currentApi().saveBpmn(Promise.resolve('<next edit />')));
    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
    expect(updateProcessState.mock.lastCall[2]).toMatchObject({
      bpmnXml: '<next edit />',
      expectedVersion: currentState.version,
    });
  });

  it('keeps the active diagram version after a background refetch', async () => {
    const updateProcessState = jest
      .fn()
      .mockResolvedValue({ bpmnXml: '<local edit />', version: 'next-version' });
    const { queryClient } = renderProcessEditor({ queries: { updateProcessState } });
    act(() =>
      queryClient.setQueryData([QueryKey.ProcessState, org, app], {
        bpmnXml: '<another editor changed this />',
        version: 'another-version',
      }),
    );
    act(() => currentApi().saveBpmn(Promise.resolve('<local edit />')));
    await waitFor(() => expect(updateProcessState).toHaveBeenCalled());
    expect(updateProcessState.mock.lastCall[2]).toMatchObject({
      bpmnXml: '<local edit />',
      expectedVersion: initialState.version,
    });
    await waitFor(() => expect(screen.getByRole('group')).not.toBeDisabled());
    expect(mockModeler.importXML).not.toHaveBeenCalled();
  });

  it('keeps editing blocked through failed reload and deferred import', async () => {
    const user = userEvent.setup();
    const currentState: ProcessState = { bpmnXml: '<current />', version: 'current-version' };
    const updateProcessState = jest
      .fn()
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: { code: 'process_state_conflict', message: 'The app has changed.' },
        },
      })
      .mockResolvedValue({ bpmnXml: '<next edit />', version: 'next-version' });
    const getProcessState = jest
      .fn()
      .mockRejectedValueOnce(new Error('Cannot load the saved process'))
      .mockResolvedValue(currentState);
    const importing = deferred<void>();
    mockModeler.importXML.mockReturnValueOnce(importing.promise);
    renderProcessEditor({ queries: { updateProcessState, getProcessState } });

    act(() => currentApi().saveBpmn(Promise.resolve('<conflicting edit />')));
    const reload = await screen.findByRole('button', {
      name: textMock('process_editor.discard_changes'),
    });
    expect(screen.getByRole('alert')).toHaveTextContent(textMock('process_editor.save_conflict'));
    expect(
      screen.queryByRole('button', { name: textMock('process_editor.retry_save') }),
    ).not.toBeInTheDocument();

    await user.click(reload);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(textMock('process_editor.reload_failed')),
    );
    expect(getProcessState).toHaveBeenCalledTimes(1);
    expect(mockModeler.importXML).not.toHaveBeenCalled();
    expect(screen.getByRole('group')).toBeDisabled();
    expect(mockCommandStack.readOnly).toBe(true);
    expect(
      screen.queryByRole('button', { name: textMock('process_editor.retry_save') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('process_editor.discard_changes') }),
    ).not.toBeInTheDocument();
    const tryAgain = screen.getByRole('button', { name: textMock('general.try_again') });
    expect(tryAgain).toHaveAttribute('data-variant', 'primary');

    await user.click(tryAgain);
    await waitFor(() => expect(mockModeler.importXML).toHaveBeenCalledWith(currentState.bpmnXml));
    expect(getProcessState).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('group')).toBeDisabled();
    expect(mockCommandStack.readOnly).toBe(true);
    expect(updateProcessState).toHaveBeenCalledTimes(1);

    await act(async () => importing.resolve());
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('group')).not.toBeDisabled();
    expect(updateProcessState).toHaveBeenCalledTimes(1);

    act(() => currentApi().saveBpmn(Promise.resolve('<next edit />')));
    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
    expect(updateProcessState.mock.lastCall[2]).toMatchObject({
      bpmnXml: '<next edit />',
      expectedVersion: currentState.version,
    });
    expect(mockModeler.importXML).toHaveBeenCalledTimes(1);
    expect(getProcessState).toHaveBeenCalledTimes(2);
  });

  it('keeps task ID edits blocked until unchanged XML is confirmed', async () => {
    const renameSave = deferred<ProcessState>();
    const updateProcessState = jest.fn().mockReturnValueOnce(renameSave.promise);
    renderProcessEditor({ queries: { updateProcessState } });

    act(() =>
      currentApi().saveBpmn(Promise.resolve('<renamed task />'), {
        taskIdChange: { oldId: 'Task_1', newId: 'NamedTask' },
      }),
    );
    expect(mockCommandStack.readOnly).toBe(true);
    expect(screen.getByRole('group')).toBeDisabled();

    await act(async () =>
      renameSave.resolve({ bpmnXml: '<renamed task />', version: 'renamed-version' }),
    );
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(screen.getByRole('group')).not.toBeDisabled();
    expect(mockModeler.importXML).not.toHaveBeenCalled();
  });

  it('imports the saved rename with selection and viewport preserved', async () => {
    const savedState: ProcessState = { bpmnXml: '<renamed />', version: 'next-version' };
    const updateProcessState = jest.fn().mockResolvedValue(savedState);
    const getProcessState = jest.fn();
    const renamedElement: ModelerElement = { id: 'NamedTask' };
    const viewbox: Rect = { x: 100, y: 200, width: 800, height: 600 };
    const importing = deferred<void>();
    mockSelection.get.mockReturnValue([{ id: 'Task_1' }]);
    mockElementRegistry.get.mockReturnValue(renamedElement);
    mockCanvas.viewbox.mockReturnValue(viewbox);
    mockModeler.importXML.mockReturnValueOnce(importing.promise);
    renderProcessEditor({ queries: { updateProcessState, getProcessState } });
    act(() =>
      currentApi().mutateLayoutSetId({
        layoutSetIdToUpdate: 'Task_1',
        newLayoutSetId: 'NamedTask',
      }),
    );
    expect(mockCommandStack.readOnly).toBe(true);
    await waitFor(() => expect(mockModeler.importXML).toHaveBeenCalledWith(savedState.bpmnXml));
    expect(mockCanvas.viewbox).toHaveBeenCalledTimes(1);
    expect(mockSelection.select).not.toHaveBeenCalled();
    await act(async () => importing.resolve());
    await waitFor(() => expect(mockCommandStack.readOnly).toBe(false));
    expect(mockCanvas.viewbox).toHaveBeenNthCalledWith(2, viewbox);
    expect(mockElementRegistry.get).toHaveBeenCalledWith(renamedElement.id);
    expect(mockSelection.select).toHaveBeenCalledWith(renamedElement);
    expect(getProcessState).not.toHaveBeenCalled();
  });
});

function currentApi(): BpmnApiContextProps {
  return mockBpmnApiContextProps.mock.lastCall[0];
}

function renderProcessEditor({
  state = initialState,
  loadMetadata = true,
  queries = {},
}: {
  state?: ProcessState | null;
  loadMetadata?: boolean;
  queries?: Record<string, jest.Mock>;
} = {}) {
  const queryClient = createQueryClientMock();
  if (state) queryClient.setQueryData([QueryKey.ProcessState, org, app], state);
  if (loadMetadata) queryClient.setQueryData([QueryKey.AppMetadata, org, app], { dataTypes: [] });
  const view = render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <ProcessEditor />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
  return { ...view, queryClient };
}

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
