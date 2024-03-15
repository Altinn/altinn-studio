import React from 'react';
import { screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '../../../testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useBpmnContext } from '../../../packages/process-editor/src/contexts/BpmnContext';

jest.mock('app-shared/hooks/useConfirmationDialogOnPageLeave', () => ({
  useConfirmationDialogOnPageLeave: jest.fn(),
}));

jest.mock('../../../packages/process-editor/src/contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

describe('ProcessEditor', () => {
  it('renders spinner when appLibVersion is not fetched', () => {
    renderProcessEditor();
    screen.getByText(textMock('process_editor.loading'));
  });

  it('renders processEditor with "noBpmnFound" error message when appLibVersion is fetched but no bpmn is found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], appDefaultResponse);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') });
  });

  it('renders processEditor with "No task selected" message in config panel when appLibVersion is fetched but no bpmnDetails are found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], appDefaultResponse);
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_no_task'));
  });

  it('renders...', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], appDefaultResponse);
    (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: { type: 'bpmn:EndEvent' } });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });
});

// test data
const org = 'org';
const app = 'app';
const appDefaultResponse: AppVersion = { backendVersion: '8', frontendVersion: '4' };

const renderProcessEditor = ({ bpmnFile = null, queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
