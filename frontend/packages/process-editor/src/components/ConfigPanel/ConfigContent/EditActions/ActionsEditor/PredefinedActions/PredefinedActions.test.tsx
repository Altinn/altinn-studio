import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { PredefinedActions } from './PredefinedActions';
import { useActionHandler } from '../hooks/useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

jest.mock('../hooks/useOnActionChange');
jest.mock('../../../../../../utils/bpmnModeler/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
  action: 'write',
};

describe('PredefinedActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be possible to choose predefined action', async () => {
    const user = userEvent.setup();

    const handeOnActionChangeMock = jest.fn();
    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: handeOnActionChangeMock,
    }));

    renderPredefinedActions();

    const select = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );

    await user.selectOptions(select, 'reject');

    await waitFor(() => expect(handeOnActionChangeMock).toHaveBeenCalledTimes(1));
    expect(handeOnActionChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'reject',
        }),
      }),
    );
  });

  it('should disable actions that are not available', async () => {
    const user = userEvent.setup();

    const handeOnActionChangeMock = jest.fn();
    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: handeOnActionChangeMock,
    }));

    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      actionElements: {
        action: [{ action: 'reject' }],
      },
    }));

    renderPredefinedActions();

    const predefinedActionsSelect = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );

    await user.click(predefinedActionsSelect);
    const predefinedOption = screen.getByRole('option', { name: 'reject' });
    expect(predefinedOption).toBeDisabled();
  });

  it('should have blank value if action is not a predefined action', async () => {
    const handeOnActionChangeMock = jest.fn();
    (useActionHandler as jest.Mock).mockImplementation(() => ({
      handleOnActionChange: handeOnActionChangeMock,
    }));

    renderPredefinedActions({ actionElement: { ...actionElementMock, action: 'not-predefined' } });

    const predefinedActionSelect = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );

    expect(predefinedActionSelect).toHaveValue(' ');
  });
});

type RenderPredefinedActionsProps = {
  actionElement?: Action;
};
const renderPredefinedActions = (props?: RenderPredefinedActionsProps) => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <PredefinedActions actionElement={props?.actionElement || actionElementMock} />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
