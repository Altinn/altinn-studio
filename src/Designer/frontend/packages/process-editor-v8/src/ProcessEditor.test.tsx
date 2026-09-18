import { render, screen } from '@testing-library/react';
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
});

const queryClientWithAppData = (appMetadata: unknown = []) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], appMetadata);
  return queryClient;
};

const renderProcessEditor = ({
  bpmnXml = null,
  queryClient = createQueryClientMock(),
}: { bpmnXml?: string | null; queryClient?: ReturnType<typeof createQueryClientMock> } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnXml);
  return render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <ProcessEditor />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
