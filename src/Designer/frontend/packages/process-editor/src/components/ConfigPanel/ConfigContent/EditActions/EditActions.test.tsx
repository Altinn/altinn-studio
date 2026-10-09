import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { EditActions } from './EditActions';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { type Action, BpmnActionModeler } from '../../../../utils/bpmnModeler/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';
import { useUniqueKeys } from '@studio/hooks';

vi.mock('../../../../utils/bpmnModeler/BpmnActionModeler');
vi.mock('@studio/hooks/src/hooks/useUniqueKeys');

const actionElementDefaultMock: Action = {
  $type: 'altinn:Action',
};

describe('EditActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add new action if actions not already exists', async () => {
    const user = userEvent.setup();

    const addNewActionToTaskMock = vi.fn();
    const updateTypeForActionMock = vi.fn();
    const updateActionNameOnActionElementMock = vi.fn();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock,
      updateTypeForActionMock,
      updateActionNameOnActionElementMock,
    });

    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: vi.fn(),
      removeUniqueKey: vi.fn(),
      getUniqueKey: () => [],
    }));

    renderEditActions();
    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });

    await user.click(addButton);
    await waitFor(() => expect(addNewActionToTaskMock).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_actions_action_card_title', {
          actionIndex: 1,
        }),
      ),
    );
  });

  it('should append new action if actions already exists', async () => {
    const user = userEvent.setup();

    const addNewActionToTaskMock = vi.fn();
    const updateTypeForActionMock = vi.fn();
    const updateActionNameOnActionElementMock = vi.fn();
    const createActionElementMock = vi.fn();
    const getExtensionElementsMock = vi.fn();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock,
      updateTypeForActionMock,
      updateActionNameOnActionElementMock,
      getExtensionElementsMock,
      createActionElementMock: createActionElementMock,
      hasActionsAlready: true,
    });

    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: vi.fn(),
      removeUniqueKey: vi.fn(),
      getUniqueKey: () => [],
    }));

    renderEditActions();
    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });

    await user.click(addButton);

    await waitFor(() => expect(updateActionNameOnActionElementMock).toHaveBeenCalledTimes(1));
  });

  it('should list existing actions in view mode', () => {
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: vi.fn(),
      updateTypeForActionMock: vi.fn(),
      updateActionNameOnActionElementMock: vi.fn(),
      hasActionsAlready: true,
      actionElementMock: {
        ...actionElementDefaultMock,
        action: 'reject',
      },
    });

    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: vi.fn(),
      removeUniqueKey: vi.fn(),
      getUniqueKey: () => [],
    }));

    renderEditActions();

    const viewModeElement = screen.getByText(
      textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
      }),
    );
    expect(viewModeElement).toBeInTheDocument();
  });

  it('should display in edit mode when adding new action', async () => {
    const user = userEvent.setup();
    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: vi.fn(),
      removeUniqueKey: vi.fn(),
      getUniqueKey: () => [],
    }));
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: vi.fn(),
      createActionElementMock: vi.fn(),
      getExtensionElementsMock: vi.fn(),
      updateActionNameOnActionElementMock: vi.fn(),
      hasActionsAlready: true,
    });
    renderEditActions();

    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await user.click(addButton);

    const predefinedActionSelector = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );
    await waitFor(() => expect(predefinedActionSelector).toBeInTheDocument());
  });

  it('should call addUniqueKey when new action item is added', async () => {
    const user = userEvent.setup();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: vi.fn(),
      updateTypeForActionMock: vi.fn(),
      updateActionNameOnActionElementMock: vi.fn(),
    });

    const addUniqueKeyMock = vi.fn();
    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: addUniqueKeyMock,
      removeUniqueKey: vi.fn(),
      getUniqueKey: () => [],
    }));

    renderEditActions();
    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });

    await user.click(addButton);

    expect(addUniqueKeyMock).toHaveBeenCalledTimes(1);
  });

  it('should removeKey when a item is deleted', async () => {
    const user = userEvent.setup();

    const removeKeyMock = vi.fn();
    (useUniqueKeys as Mock).mockImplementation(() => ({
      addUniqueKey: vi.fn(),
      removeUniqueKey: removeKeyMock,
      getUniqueKey: () => [],
    }));
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: vi.fn(),
      updateTypeForActionMock: vi.fn(),
      updateActionNameOnActionElementMock: vi.fn(),
      hasActionsAlready: true,
      actionElementMock: {
        ...actionElementDefaultMock,
        action: 'reject',
      },
    });

    renderEditActions();

    const viewModeElement = screen.getByText(
      textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
      }),
    );
    expect(viewModeElement).toBeInTheDocument();
    await user.click(viewModeElement);

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', {
        item: 'reject',
      }),
    });
    await user.click(deleteButton);

    expect(removeKeyMock).toHaveBeenCalledTimes(1);
  });
});

const renderEditActions = () => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <EditActions />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};

type BpmnActionModelerMock = {
  addNewActionToTaskMock: Mock;
  updateTypeForActionMock: Mock;
  updateActionNameOnActionElementMock: Mock;
  hasActionsAlready: boolean;
  createActionElementMock: Mock;
  getExtensionElementsMock: Mock;
};

const setupBpmnActionModelerMock = ({
  addNewActionToTaskMock,
  updateTypeForActionMock,
  updateActionNameOnActionElementMock,
  hasActionsAlready,
  createActionElementMock,
  getExtensionElementsMock,
  actionElementMock,
}: Partial<BpmnActionModelerMock & { actionElementMock: Action }>) =>
  (BpmnActionModeler as Mock).mockImplementation(function () {
    return {
      addNewActionToTask: addNewActionToTaskMock,
      updateTypeForAction: updateTypeForActionMock,
      updateActionNameOnActionElement: updateActionNameOnActionElementMock,
      deleteActionFromTask: vi.fn(),
      createActionElement: createActionElementMock,
      getExtensionElements: getExtensionElementsMock,
      hasActionsAlready,
      getTypeForAction: vi.fn().mockReturnValue('Process'),
      actionElements: {
        action: [actionElementMock || actionElementDefaultMock],
      },
    };
  });
