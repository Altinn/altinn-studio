import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { PredefinedActions } from './PredefinedActions';
import { useActionHandler } from '../hooks/useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import { type Action } from '../../../../../../utils/bpmn/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

jest.mock('../hooks/useOnActionChange');
jest.mock('../../../../../../utils/bpmn/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
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
});

const renderPredefinedActions = () => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <PredefinedActions actionElement={actionElementMock} />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
