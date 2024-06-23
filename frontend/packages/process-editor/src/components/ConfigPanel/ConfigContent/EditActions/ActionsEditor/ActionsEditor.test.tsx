import React from 'react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import { ActionsEditor, type ActionsEditorProps } from './ActionsEditor';
import { mockBpmnContextValue } from '../../../../../../test/mocks/bpmnContextMock';
import { BpmnActionModeler, type Action } from '../../../../../utils/bpmn/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';

jest.mock('../../../../../utils/bpmn/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
  action: 'reject',
};

describe('ActionsEditor', () => {
  it('should display action in view mode', () => {
    renderActionsEditor();
    const actionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: 'reject',
      }),
    });
    expect(actionButton).toBeInTheDocument();
  });

  it('should change to edit mode when clicking on action button', async () => {
    const user = userEvent.setup();
    renderActionsEditor();
    const actionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: 'reject',
      }),
    });

    await user.click(actionButton);
    const actionSelector = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );
    expect(actionSelector).toBeInTheDocument();
  });

  it('should display edit mode when mode is set to edit', () => {
    renderActionsEditor({ mode: 'edit' });
    const actionSelector = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );
    expect(actionSelector).toBeInTheDocument();
  });

  it('should be possible to toggle to view mode from edit mode by clicking close button', async () => {
    const user = userEvent.setup();
    renderActionsEditor({ mode: 'edit' });

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.close_item', {
        item: 'reject',
      }),
    });
    await user.click(cancelButton);

    const actionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: 'reject',
      }),
    });
    expect(actionButton).toBeInTheDocument();
  });

  it('should be possible to delete action from task', async () => {
    const user = userEvent.setup();
    const deleteActionFromTaskMock = jest.fn();

    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      deleteActionFromTask: deleteActionFromTaskMock,
    }));

    renderActionsEditor({ mode: 'edit' });

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', {
        item: 'reject',
      }),
    });
    await user.click(deleteButton);

    await waitFor(() =>
      expect(deleteActionFromTaskMock).toHaveBeenCalledWith(
        expect.objectContaining({
          $type: 'altinn:Action',
          action: 'reject',
        }),
      ),
    );

    const actionButton = screen.queryByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: 'reject',
      }),
    });
    expect(actionButton).not.toBeInTheDocument();
  });

  it('should be possible to toggle between predefined and custom actions', async () => {
    const user = userEvent.setup();
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      getTypeForAction: () => 'serverAction',
    }));

    renderActionsEditor({ mode: 'edit' });

    const customActionButton = screen.getByRole('tab', {
      name: textMock('process_editor.configuration_panel_actions_action_card_custom'),
    });

    await user.click(customActionButton);
    const customActionTextfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
    );
    expect(customActionTextfield).toBeInTheDocument();

    const predefinedActionButton = screen.getByRole('tab', {
      name: textMock('process_editor.configuration_panel_actions_action_tab_predefined'),
    });
    await user.click(predefinedActionButton);
    const predefinedActionSelect = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );
    expect(predefinedActionSelect).toBeInTheDocument();
  });

  it('should display custom action view when action is of type custom', () => {
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      getTypeForAction: () => 'serverAction',
    }));

    renderActionsEditor({
      actionElement: { ...actionElementMock, action: 'my-custom-action' },
      mode: 'edit',
    });
    const customActionTextfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
    );
    expect(customActionTextfield).toBeInTheDocument();
  });
});

type RenderActionsEditorProps = {
  mode?: ActionsEditorProps['mode'];
  actionElement?: Action;
};
const renderActionsEditor = (props?: Partial<RenderActionsEditorProps>) => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <ActionsEditor
          actionElement={props?.actionElement || actionElementMock}
          mode={props?.mode || 'view'}
          actionIndex={0}
        />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
