import { act, render, screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useBpmnContext } from './contexts/BpmnContext';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { toast } from 'react-toastify';

const defaultAppVersion: AppVersion = { backendVersion: '8.0.0', frontendVersion: '4.0.0' };
const mockBpmnXml: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

jest.mock('./contexts/BpmnContext', () => ({
  ...jest.requireActual('./contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

jest.mock('./components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn().mockReturnValue(true),
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

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { error: jest.fn() },
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders spinner when the app version is not fetched', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppMetadata, org, app], []);

    renderProcessEditor({ queryClient });

    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('renders spinner when the application metadata is not fetched', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);

    renderProcessEditor({ queryClient });

    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('renders the "no bpmn found" error when the app version is fetched but no bpmn exists', () => {
    renderProcessEditor({ queryClient: queryClientWithAppData() });

    expect(
      screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') }),
    ).toBeInTheDocument();
  });

  it('renders the "no bpmn found" error when the bpmn query fails', () => {
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

  it('renders "no task selected" in the config panel when no bpmn details are found', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: null });

    renderProcessEditor({ bpmnXml: mockBpmnXml, queryClient: queryClientWithAppData() });

    expect(
      screen.getByText(textMock('process_editor.configuration_view_panel_no_task')),
    ).toBeInTheDocument();
  });

  it('renders the config panel for the end event when the bpmn details have the end event type', () => {
    const queryClient = queryClientWithAppData({ dataTypes: [{ id: 'dataType1' }] });
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
      isEditAllowed: true,
    });

    renderProcessEditor({ bpmnXml: mockBpmnXml, queryClient });

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_end_event')),
    ).toBeInTheDocument();
  });
  describe('saveBpmn', () => {
    it('resolves when the process definition is saved', async () => {
      const { saveBpmn } = renderProcessEditorAndGetProps({
        updateBpmnXml: jest.fn().mockResolvedValue(undefined),
      });
      await act(() => expect(saveBpmn('<xml></xml>')).resolves.toBeUndefined());
    });

    it('rejects and shows an error when saving the process definition fails', async () => {
      const { saveBpmn } = renderProcessEditorAndGetProps({
        updateBpmnXml: jest.fn().mockRejectedValue(createApiErrorMock(ServerCodes.BadRequest)),
      });
      await act(() => expect(saveBpmn('<xml></xml>')).rejects.toEqual(expect.anything()));
      expect(toast.error).toHaveBeenCalledWith(textMock('process_editor.save_bpmn_xml_error'));
    });
  });

  describe('getSavedBpmn', () => {
    it('fetches the process definition from the server', async () => {
      const savedXml = '<saved></saved>';
      const getBpmnFile = jest.fn().mockResolvedValue(savedXml);
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
  queryClient.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], appMetadata);
  return queryClient;
};

const renderProcessEditorAndGetProps = (
  queries: Record<string, jest.Mock>,
): BpmnApiContextProps => {
  (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: null, isEditAllowed: true });
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
  queries?: Record<string, jest.Mock>;
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
