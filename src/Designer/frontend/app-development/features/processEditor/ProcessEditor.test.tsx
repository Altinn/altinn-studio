import { act, screen } from '@testing-library/react';
import ProcessEditor from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { app, org } from '@studio/testing/testids';
import { pagesModelMock } from '@altinn/ux-editor-v4/testing/layoutMock';
import type { ProcessEditorProps } from '@altinn/process-editor/ProcessEditor';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

// test data
const defaultAppVersion: AppVersion = { backendVersion: '8.0.0', frontendVersion: '4.0.0' };

jest.mock('@altinn/process-editor/contexts/BpmnContext', () => ({
  ...jest.requireActual('@altinn/process-editor/contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

jest.mock('@altinn/process-editor/components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

const mockProcessEditorProps = jest.fn();
jest.mock('@altinn/process-editor', () => {
  const actual = jest.requireActual('@altinn/process-editor');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    ProcessEditor: (props: ProcessEditorProps) => {
      mockProcessEditorProps(props);
      return createElement(actual.ProcessEditor, props);
    },
  };
});

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn().mockReturnValue(true),
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders spinner when appLibVersion is not fetched', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], []);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByLabelText(textMock('process_editor.loading'));
  });

  it('renders spinner when appMetadata is not fetched', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByLabelText(textMock('process_editor.loading'));
  });

  it('renders processEditor with "noBpmnFound" error message when appLibVersion is fetched but no bpmn is found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], []);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') });
  });

  it('renders processEditor with "No task selected" message in config panel when appLibVersion is fetched but no bpmnDetails are found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], []);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: null,
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_view_panel_no_task'));
  });

  it('renders config panel for end event when bpmnDetails has endEvent type', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], {
      dataTypes: [{ id: 'dataType1' }],
    });
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
      isEditAllowed: true,
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });

  it('should render the ProcessEditor component', () => {
    renderProcessEditor();
  });

  describe('saveBpmn', () => {
    const renderLoadedProcessEditor = (updateBpmnXml: jest.Mock) => {
      const queryClient = createQueryClientMock();
      queryClient.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
      queryClient.setQueryData([QueryKey.AppMetadata, org, app], []);
      renderProcessEditor({ queryClient, queries: { updateBpmnXml } });
      const { saveBpmn } = mockProcessEditorProps.mock.lastCall[0] as ProcessEditorProps;
      return saveBpmn;
    };

    it('resolves when the process definition is saved', async () => {
      const saveBpmn = renderLoadedProcessEditor(jest.fn().mockResolvedValue(undefined));
      await act(() => expect(saveBpmn('<xml></xml>')).resolves.toBeUndefined());
    });

    it('rejects and shows an error when saving the process definition fails', async () => {
      const saveBpmn = renderLoadedProcessEditor(
        jest.fn().mockRejectedValue(createApiErrorMock(ServerCodes.BadRequest)),
      );
      await act(() => expect(saveBpmn('<xml></xml>')).rejects.toEqual(expect.anything()));
      expect(
        await screen.findByText(textMock('process_editor.save_bpmn_xml_error')),
      ).toBeInTheDocument();
    });
  });
});

const renderProcessEditor = ({
  bpmnFile = null,
  queryClient = createQueryClientMock(),
  queries = {},
} = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  queryClient.setQueryData([QueryKey.Pages, org, app], pagesModelMock);
  return renderWithProviders(<ProcessEditor />, {
    queries,
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
