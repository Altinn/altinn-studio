import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { CustomActions, type CustomActionsProps } from './CustomActions';
import { useActionHandler } from '../hooks/useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

vi.mock('../hooks/useOnActionChange');
vi.mock('../../../../../../utils/bpmnModeler/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
};

describe('CustomActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be possible to add new custom action', async () => {
    const user = userEvent.setup();

    const handeOnActionChangeMock = vi.fn();
    (useActionHandler as Mock).mockImplementation(() => ({
      handleOnActionChange: handeOnActionChangeMock,
    }));

    renderCustomAction();

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
    );

    const myCustomActionName = 'My custom action';
    await user.type(inputField, myCustomActionName);
    await waitFor(() => expect(handeOnActionChangeMock).toHaveBeenCalledTimes(1));
    expect(handeOnActionChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: myCustomActionName,
        }),
      }),
    );
  });

  it('should be possible to change action type', async () => {
    const user = userEvent.setup();

    (useActionHandler as Mock).mockImplementation(() => ({
      handleOnActionChange: vi.fn(),
    }));

    const updateTypeForActionMock = vi.fn();
    (BpmnActionModeler as Mock).mockImplementation(function () {
      return {
        updateTypeForAction: updateTypeForActionMock,
        getTypeForAction: vi.fn().mockReturnValue('processAction'),
      };
    });

    renderCustomAction();

    const actionTypeSwitch = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_set_server_action_label'),
    );
    expect(actionTypeSwitch).toBeChecked();
    await user.click(actionTypeSwitch);

    expect(updateTypeForActionMock).toHaveBeenCalledTimes(1);
    expect(updateTypeForActionMock).toHaveBeenCalledWith(actionElementMock, 'serverAction');

    await user.click(actionTypeSwitch);
    expect(updateTypeForActionMock).toHaveBeenCalledTimes(2);
  });

  it('should be possible to change action type to process', async () => {
    const user = userEvent.setup();

    (useActionHandler as Mock).mockImplementation(() => ({
      handleOnActionChange: vi.fn(),
    }));

    const updateTypeForActionMock = vi.fn();
    (BpmnActionModeler as Mock).mockImplementation(function () {
      return {
        updateTypeForAction: updateTypeForActionMock,
        getTypeForAction: vi.fn().mockReturnValue('serverAction'),
      };
    });

    renderCustomAction();

    const actionTypeSwitch = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_set_server_action_label'),
    );
    await user.click(actionTypeSwitch);

    expect(updateTypeForActionMock).toHaveBeenCalledTimes(1);
    expect(updateTypeForActionMock).toHaveBeenCalledWith(actionElementMock, 'processAction');
  });

  it('should not be possible to change action type if action is predefined', async () => {
    const user = userEvent.setup();

    (useActionHandler as Mock).mockImplementation(() => ({
      handleOnActionChange: vi.fn(),
    }));

    const updateTypeForActionMock = vi.fn();
    (BpmnActionModeler as Mock).mockImplementation(function () {
      return {
        updateTypeForAction: updateTypeForActionMock,
        getTypeForAction: vi.fn().mockReturnValue('Process'),
      };
    });

    renderCustomAction({ actionElement: { ...actionElementMock, action: 'write' } });

    const actionTypeSwitch = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_set_server_action_label'),
    );
    await user.click(actionTypeSwitch);

    expect(updateTypeForActionMock).toHaveBeenCalledTimes(0);
  });

  it('should display help text for action type', () => {
    (useActionHandler as Mock).mockImplementation(() => ({
      handleOnActionChange: vi.fn(),
    }));

    renderCustomAction();

    const helpText = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_type_help_text'),
    });

    expect(helpText).toBeInTheDocument();
  });
});

const renderCustomAction = (props?: Partial<CustomActionsProps>) => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <CustomActions actionElement={props?.actionElement || actionElementMock} />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
