import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditServiceTaskType } from './EditServiceTaskType';
import { BpmnContext } from '../../../../contexts/BpmnContext';
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
const setBpmnDetails = jest.fn();

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
    renderEditServiceTaskType(createServiceTaskDetails('myServiceTask', [taskExtension]));

    await openField(user);
    await user.clear(screen.getByLabelText(labelText));
    await user.type(screen.getByLabelText(labelText), 'myOtherServiceTask');
    await user.tab();

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { taskType: 'myOtherServiceTask' },
      taskExtension,
    );
    expect(setBpmnDetails).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: 'myOtherServiceTask' }),
    );
  });

  it('creates the task extension when a hand-authored service task has none', async () => {
    const user = userEvent.setup();
    renderEditServiceTaskType(createServiceTaskDetails(null, undefined));

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

  it('keeps an extension of another type and puts the task extension first', async () => {
    const user = userEvent.setup();
    const gatewayExtension = {
      $type: 'altinn:GatewayExtension',
      connectedDataTypeId: 'model',
    } as unknown as ModdleElement;
    renderEditServiceTaskType(createServiceTaskDetails(null, [gatewayExtension]));

    await openField(user);
    await user.type(screen.getByLabelText(labelText), 'myServiceTask');
    await user.tab();

    expect(createElement).toHaveBeenCalledWith('bpmn:ExtensionElements', {
      values: [expect.objectContaining({ $type: 'altinn:TaskExtension' }), gatewayExtension],
    });
  });

  it('blocks saving an empty task type', async () => {
    const user = userEvent.setup();
    renderEditServiceTaskType(
      createServiceTaskDetails('myServiceTask', [createTaskExtension('myServiceTask')]),
    );

    await openField(user);
    await user.clear(screen.getByLabelText(labelText));
    await user.tab();

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    expect(updateModdleProperties).not.toHaveBeenCalled();
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

const renderEditServiceTaskType = (bpmnDetails: BpmnDetails) =>
  render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, bpmnDetails, setBpmnDetails }}>
      <EditServiceTaskType />
    </BpmnContext.Provider>,
  );
