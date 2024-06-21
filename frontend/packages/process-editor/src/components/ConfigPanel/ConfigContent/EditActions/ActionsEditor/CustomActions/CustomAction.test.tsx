import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { CustomActions, CustomActionsProps } from './CustomActions';
import { useActionHandler } from '../hooks/useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import { type Action, BpmnActionModeler } from '../../../../../../utils/bpmn/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

jest.mock('../hooks/useOnActionChange');
jest.mock('../../../../../../utils/bpmn/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
};

describe('CustomActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be possible to add new custom action', async () => {
    const user = userEvent.setup();

    const handeOnActionChangeMock = jest.fn();
    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: handeOnActionChangeMock,
    }));

    renderCustomAction();

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
    );

    await user.type(inputField, 'My custom action');
    await waitFor(() => expect(handeOnActionChangeMock).toHaveBeenCalledTimes(1));
    expect(handeOnActionChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'My custom action',
        }),
      }),
    );
  });

  it('should be possible to change action type', async () => {
    const user = userEvent.setup();

    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: jest.fn(),
    }));

    const updateTypeForActionMock = jest.fn();
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      updateTypeForAction: updateTypeForActionMock,
      getTypeForAction: jest.fn().mockReturnValue('Process'),
    }));

    renderCustomAction();

    const actionTypeSwitch = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_set_server_action_label'),
    );
    await user.click(actionTypeSwitch);

    expect(updateTypeForActionMock).toHaveBeenCalledTimes(1);
    expect(updateTypeForActionMock).toHaveBeenCalledWith(actionElementMock, 'serverAction');
  });

  it('should not be possible to change action type if action is predefined', async () => {
    const user = userEvent.setup();

    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: jest.fn(),
    }));

    const updateTypeForActionMock = jest.fn();
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      updateTypeForAction: updateTypeForActionMock,
      getTypeForAction: jest.fn().mockReturnValue('Process'),
    }));

    renderCustomAction({ actionElement: { ...actionElementMock, action: 'write' } });

    const actionTypeSwitch = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_set_server_action_label'),
    );
    await user.click(actionTypeSwitch);

    expect(updateTypeForActionMock).toHaveBeenCalledTimes(0);
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
