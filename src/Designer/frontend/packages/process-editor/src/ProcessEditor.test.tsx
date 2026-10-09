import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useBpmnContext } from './contexts/BpmnContext';
import type { BpmnApiContextProps, BpmnApiContextProvider } from './contexts/BpmnApiContext';
import type * as React from 'react';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { toast } from 'react-toastify';

const mockBpmnXml: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

vi.mock('./contexts/BpmnContext', async () => ({
  ...(await vi.importActual('./contexts/BpmnContext')),
  useBpmnContext: vi.fn(),
}));

vi.mock('./components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

vi.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: vi.fn().mockReturnValue(true),
}));

const mockBpmnApiContextProps = vi.fn();
vi.mock('./contexts/BpmnApiContext', async () => {
  const actual = await vi.importActual<{ BpmnApiContextProvider: typeof BpmnApiContextProvider }>(
    './contexts/BpmnApiContext',
  );
  const { createElement } = await vi.importActual<typeof React>('react');
  return {
    ...actual,
    BpmnApiContextProvider: (props: BpmnApiContextProps) => {
      mockBpmnApiContextProps(props);
      return createElement(actual.BpmnApiContextProvider, props);
    },
  };
});

vi.mock('react-toastify', async () => ({
  ...(await vi.importActual('react-toastify')),
  toast: { error: vi.fn() },
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner while loading application metadata', () => {
    renderProcessEditor({ queryClient: createQueryClientMock() });

    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('shows an error when the BPMN is missing', () => {
    renderProcessEditor({ queryClient: queryClientWithAppData() });

    expect(
      screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') }),
    ).toBeInTheDocument();
  });

  it('shows an error when the BPMN request fails', () => {
    const queryClient = queryClientWithAppData();
    queryClient.setQueryData([QueryKey.FetchBpmn, org, app], undefined);
    queryClient
      .getQueryCache()
      .find({ queryKey: [QueryKey.FetchBpmn, org, app] })
      ?.setState({
        status: 'error',
        error: new Error('Not found'),
      });

    renderProcessEditor({ bpmnXml: undefined, queryClient });

    expect(
      screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') }),
    ).toBeInTheDocument();
  });

  it('shows the empty configuration panel when no element is selected', () => {
    (useBpmnContext as Mock).mockReturnValue({ bpmnDetails: null });

    renderProcessEditor({ bpmnXml: mockBpmnXml, queryClient: queryClientWithAppData() });

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_task_title')),
    ).toBeInTheDocument();
  });

  it('shows the end event configuration when an end event is selected', () => {
    const queryClient = queryClientWithAppData({ dataTypes: [{ id: 'dataType1' }] });
    (useBpmnContext as Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
    });

    renderProcessEditor({ bpmnXml: mockBpmnXml, queryClient });

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_end_event')),
    ).toBeInTheDocument();
  });
  describe('saveBpmn', () => {
    it('resolves when the process definition is saved', async () => {
      const { saveBpmn } = renderProcessEditorAndGetProps({
        updateBpmnXml: vi.fn().mockResolvedValue(undefined),
      });
      await act(() => expect(saveBpmn('<xml></xml>')).resolves.toBeUndefined());
    });

    it('rejects and shows an error when saving the process definition fails', async () => {
      const { saveBpmn } = renderProcessEditorAndGetProps({
        updateBpmnXml: vi.fn().mockRejectedValue(createApiErrorMock(ServerCodes.BadRequest)),
      });
      await act(() => expect(saveBpmn('<xml></xml>')).rejects.toEqual(expect.anything()));
      expect(toast.error).toHaveBeenCalledWith(textMock('process_editor.save_bpmn_xml_error'));
    });
  });

  describe('getSavedBpmn', () => {
    it('fetches the process definition from the server', async () => {
      const savedXml = '<saved></saved>';
      const getBpmnFile = vi.fn().mockResolvedValue(savedXml);
      const { getSavedBpmn } = renderProcessEditorAndGetProps({ getBpmnFile });
      getBpmnFile.mockClear();

      let result: string;
      await act(async () => {
        result = await getSavedBpmn();
      });

      expect(getBpmnFile).toHaveBeenCalledTimes(1);
      expect(result).toBe(savedXml);
    });
  });
});

const queryClientWithAppData = (appMetadata: unknown = []) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], appMetadata);
  return queryClient;
};

const renderProcessEditorAndGetProps = (queries: Record<string, Mock>): BpmnApiContextProps => {
  (useBpmnContext as Mock).mockReturnValue({ bpmnDetails: null, isEditAllowed: true });
  renderProcessEditor({ bpmnXml: mockBpmnXml, queryClient: queryClientWithAppData(), queries });
  return mockBpmnApiContextProps.mock.lastCall[0] as BpmnApiContextProps;
};

const renderProcessEditor = ({
  bpmnXml = null,
  queryClient = createQueryClientMock(),
  queries = {},
}: {
  bpmnXml?: string | null;
  queryClient?: ReturnType<typeof createQueryClientMock>;
  queries?: Record<string, Mock>;
} = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnXml);
  return render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <ProcessEditor />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
