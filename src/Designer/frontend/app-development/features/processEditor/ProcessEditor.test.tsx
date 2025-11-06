import React from 'react';
import { screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { app, org } from '@studio/testing/testids';
import { pagesModelMock } from '@altinn/ux-editor/testing/layoutMock';

// test data
const defaultAppVersion: AppVersion = { backendVersion: '8.0.0', frontendVersion: '4.0.0' };

jest.mock('@altinn/process-editor/contexts/BpmnContext', () => ({
  ...jest.requireActual('@altinn/process-editor/contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

jest.mock('@altinn/process-editor/components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

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
});

const renderProcessEditor = ({ bpmnFile = null, queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  queryClient.setQueryData([QueryKey.Pages, org, app], pagesModelMock);
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
