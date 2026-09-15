import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditServiceTaskType } from './EditServiceTaskType';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';

const updateModdleProperties = jest.fn();
const updateElementProperties = jest.fn();
const createElement = jest.fn((elementType: string, options: object) => ({
  $type: elementType,
  ...options,
}));
const setBpmnDetailsSpy = jest.fn();

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) => updateModdleProperties(...args),
    updateElementProperties: (...args: unknown[]) => updateElementProperties(...args),
    createElement: (...args: unknown[]) => createElement(...(args as [string, object])),
  })),
}));

const labelText = textMock('process_editor.configuration_panel_service_task_type_label');

describe('EditServiceTaskType', () => {
  afterEach(jest.clearAllMocks);

  it('writes the typed task type into the existing task extension', async () => {
    const user = userEvent.setup();
    const taskExtension = createTaskExtension('myServiceTask');
    renderEditServiceTaskType({
      bpmnContextProps: {
        bpmnDetails: createServiceTaskDetails('myServiceTask', [taskExtension]),
      },
    });

    await openField(user);
    await user.clear(screen.getByLabelText(labelText));
    await user.type(screen.getByLabelText(labelText), 'myOtherServiceTask');
    await user.tab();

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { taskType: 'myOtherServiceTask' },
      taskExtension,
    );
    expect(setBpmnDetailsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: 'myOtherServiceTask' }),
    );
  });

  it('creates the task extension when a hand-authored service task has none', async () => {
    const user = userEvent.setup();
    renderEditServiceTaskType({
      bpmnContextProps: { bpmnDetails: createServiceTaskDetails(null, undefined) },
    });

    await openField(user);
    await user.type(screen.getByLabelText(labelText), 'myServiceTask');
    await user.tab();

    expect(updateModdleProperties).not.toHaveBeenCalled();
    expect(createElement).toHaveBeenCalledWith('altinn:TaskExtension', {
      taskType: 'myServiceTask',
    });
    expect(updateElementProperties).toHaveBeenCalledWith({
      extensionElements: expect.objectContaining({ $type: 'bpmn:ExtensionElements' }),
    });
  });

  it('keeps an extension of another type instead of replacing the whole node', async () => {
    const user = userEvent.setup();
    const gatewayExtension = {
      $type: 'altinn:GatewayExtension',
      connectedDataTypeId: 'model',
    } as unknown as ModdleElement;
    renderEditServiceTaskType({
      bpmnContextProps: { bpmnDetails: createServiceTaskDetails(null, [gatewayExtension]) },
    });

    await openField(user);
    await user.type(screen.getByLabelText(labelText), 'myServiceTask');
    await user.tab();

    // The foreign extension must survive, and the task extension must stay at index 0, which is
    // where the rest of the editor reads it from.
    expect(createElement).toHaveBeenCalledWith('bpmn:ExtensionElements', {
      values: [expect.objectContaining({ $type: 'altinn:TaskExtension' }), gatewayExtension],
    });
  });

  it('blocks saving an empty task type', async () => {
    const user = userEvent.setup();
    renderEditServiceTaskType({
      bpmnContextProps: {
        bpmnDetails: createServiceTaskDetails('myServiceTask', [
          createTaskExtension('myServiceTask'),
        ]),
      },
    });

    await openField(user);
    await user.clear(screen.getByLabelText(labelText));
    await user.tab();

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    expect(updateModdleProperties).not.toHaveBeenCalled();
  });

  it('warns about a task type that collides with a built in one, but still saves it', async () => {
    const user = userEvent.setup();
    const taskExtension = createTaskExtension('myServiceTask');
    renderEditServiceTaskType({
      bpmnContextProps: {
        bpmnDetails: createServiceTaskDetails('myServiceTask', [taskExtension]),
      },
    });

    await openField(user);
    await user.clear(screen.getByLabelText(labelText));
    await user.type(screen.getByLabelText(labelText), 'pdf');
    await user.tab();

    // Saved, not blocked: a colliding type is legal, and the developer may mean it.
    expect(updateModdleProperties).toHaveBeenCalledWith({ taskType: 'pdf' }, taskExtension);
    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
    expect(
      await screen.findByText(
        textMock('process_editor.configuration_panel_service_task_type_built_in_warning'),
      ),
    ).toBeInTheDocument();
  });

  it('stays quiet about a built in task type the panel was opened on', () => {
    renderEditServiceTaskType({
      bpmnContextProps: {
        bpmnDetails: createServiceTaskDetails('eFormidling', [createTaskExtension('eFormidling')]),
      },
    });

    expect(
      screen.queryByText(
        textMock('process_editor.configuration_panel_service_task_type_built_in_warning'),
      ),
    ).not.toBeInTheDocument();
  });

  it('shows no warning for a task type of the app’s own', () => {
    renderEditServiceTaskType({
      bpmnContextProps: {
        bpmnDetails: createServiceTaskDetails('pdfIfRequested', [
          createTaskExtension('pdfIfRequested'),
        ]),
      },
    });

    expect(
      screen.queryByText(
        textMock('process_editor.configuration_panel_service_task_type_built_in_warning'),
      ),
    ).not.toBeInTheDocument();
  });
});

const openField = async (user: ReturnType<typeof userEvent.setup>): Promise<void> =>
  user.click(screen.getByRole('button', { name: labelText }));

const createTaskExtension = (taskType: string): ModdleElement =>
  ({ $type: 'altinn:TaskExtension', taskType }) as ModdleElement;

const createServiceTaskDetails = (
  taskType: string | null,
  extensionValues?: ModdleElement[],
): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType,
  type: BpmnTypeEnum.ServiceTask,
  element: {
    ...mockBpmnDetails.element,
    businessObject: {
      extensionElements: extensionValues ? { values: extensionValues } : undefined,
    },
  },
});

type RenderProps = {
  bpmnContextProps?: Partial<BpmnContextProps>;
};

/**
 * The provider holds the bpmn details in state rather than handing over a frozen object, because
 * the panel reads the task type back out of context after saving it. With a mock setter the
 * component would never see its own write, and anything that depends on the saved value — the
 * built in warning above all — would look broken in tests and work in the app.
 */
const renderEditServiceTaskType = (props: RenderProps = {}) => {
  const { bpmnContextProps } = props;

  const StatefulBpmnProvider = (): React.ReactElement => {
    const [bpmnDetails, setBpmnDetails] = useState<BpmnDetails>(
      bpmnContextProps?.bpmnDetails ?? mockBpmnDetails,
    );

    const handleSetBpmnDetails: BpmnContextProps['setBpmnDetails'] = (value) => {
      setBpmnDetailsSpy(value);
      setBpmnDetails(value as BpmnDetails);
    };

    return (
      <BpmnContext.Provider
        value={{
          ...mockBpmnContextValue,
          ...bpmnContextProps,
          bpmnDetails,
          setBpmnDetails: handleSetBpmnDetails,
        }}
      >
        <EditServiceTaskType />
      </BpmnContext.Provider>
    );
  };

  return render(<StatefulBpmnProvider />);
};
