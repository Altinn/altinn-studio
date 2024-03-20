import React from 'react';
import { act, screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '../../../testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME, PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { useBpmnContext } from '../../../packages/process-editor/src/contexts/BpmnContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { layoutSets } from 'app-shared/mocks/mocks';
import { layoutSetsMock } from '../../../packages/ux-editor/src/testing/layoutMock';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

// test data
const org = 'org';
const app = 'app';
const defaultAppVersion: AppVersion = { backendVersion: '8.0.0', frontendVersion: '4.0.0' };

jest.mock('app-shared/hooks/useConfirmationDialogOnPageLeave', () => ({
  useConfirmationDialogOnPageLeave: jest.fn(),
}));

jest.mock('../../../packages/process-editor/src/contexts/BpmnContext', () => ({
  ...jest.requireActual('../../../packages/process-editor/src/contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

jest.mock('../../../packages/process-editor/src/components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn().mockReturnValue(true),
}));

describe('ProcessEditor', () => {
  it('renders spinner when appLibVersion is not fetched', () => {
    renderProcessEditor();
    screen.getByText(textMock('process_editor.loading'));
  });

  it('renders processEditor with "noBpmnFound" error message when appLibVersion is fetched but no bpmn is found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') });
  });

  it('renders processEditor with "No task selected" message in config panel when appLibVersion is fetched but no bpmnDetails are found', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: null,
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_no_task'));
  });

  it('renders config panel for end event when bpmnDetails has endEvent type', () => {
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });

  it('calls onUpdateLayoutSet and trigger addLayoutSet mutation call when layoutSetName for custom receipt is added', async () => {
    const customReceiptLayoutSetName = 'CustomReceipt';
    const user = userEvent.setup();
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    const inputFieldButton = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add'),
    );
    await act(() => user.click(inputFieldButton));
    const inputField = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    );
    await act(() => user.type(inputField, customReceiptLayoutSetName));
    await act(() => user.tab());
    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, customReceiptLayoutSetName, {
      id: customReceiptLayoutSetName,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    });
  });

  it('calls onUpdateLayoutSet and trigger updateLayoutSet mutation call when layoutSetName for custom receipt is changed', async () => {
    const customReceiptLayoutSetName = 'CustomReceipt';
    const newCustomReceiptLayoutSetName = 'NewCustomReceipt';
    const user = userEvent.setup();
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    const layoutSetsWithCustomReceipt: LayoutSetConfig[] = [
      ...layoutSets.sets,
      { id: customReceiptLayoutSetName, tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT] },
    ];
    queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], {
      ...layoutSetsMock,
      sets: layoutSetsWithCustomReceipt,
    });
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    const inputFieldButton = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add'),
    );
    await act(() => user.click(inputFieldButton));
    const inputField = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    );
    await act(() => user.clear(inputField));
    await act(() => user.type(inputField, newCustomReceiptLayoutSetName));
    await act(() => user.tab());
    expect(queriesMock.updateLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateLayoutSet).toHaveBeenCalledWith(org, app, customReceiptLayoutSetName, {
      id: newCustomReceiptLayoutSetName,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    });
  });
});

const renderProcessEditor = ({ bpmnFile = null, queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
