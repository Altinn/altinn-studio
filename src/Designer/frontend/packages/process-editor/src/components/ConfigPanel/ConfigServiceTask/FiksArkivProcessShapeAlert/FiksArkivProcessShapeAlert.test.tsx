import { act, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Element } from 'bpmn-js/lib/model/Types';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FiksArkivProcessShapeAlert } from './FiksArkivProcessShapeAlert';
import type { ProcessShapeElement, ProcessShapeFlow } from './fiksArkivProcessShape';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { modelerOnMock } from '../../../../../test/mocks/bpmnModelerMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';

describe('FiksArkivProcessShapeAlert', () => {
  afterEach(jest.clearAllMocks);

  it('warns while nothing follows the task', () => {
    renderFiksArkivProcessShapeAlert(createTask([]));

    expect(screen.getByText(missingGatewayText)).toBeInTheDocument();
  });

  it('names the gateway that has too few flows', () => {
    renderFiksArkivProcessShapeAlert(createTask([createGateway('Gateway_1', 1)]));

    expect(screen.getByText(gatewayWithoutBranchesText(['Gateway_1']))).toBeInTheDocument();
  });

  it('says nothing while a gateway with two flows follows the task', () => {
    renderFiksArkivProcessShapeAlert(createTask([createGateway('Gateway_1', 2)]));

    expect(screen.queryByText(missingGatewayText)).not.toBeInTheDocument();
    expect(screen.queryByText(gatewayWithoutBranchesText(['Gateway_1']))).not.toBeInTheDocument();
  });

  it('stops warning once the diagram has the gateway, without the task being selected again', () => {
    const task = createTask([]);
    renderFiksArkivProcessShapeAlert(task);

    task.outgoing.push(createSequenceFlow(createGateway('Gateway_1', 2)));
    act(() => notifyDiagramChanged());

    expect(screen.queryByText(missingGatewayText)).not.toBeInTheDocument();
  });
});

const missingGatewayText = textMock(
  'process_editor.configuration_panel.fiks_arkiv.missing_gateway_alert',
);

const gatewayWithoutBranchesText = (gatewayIds: string[]): string =>
  textMock('process_editor.configuration_panel.fiks_arkiv.gateway_without_branches_alert', {
    count: gatewayIds.length,
    gateways: gatewayIds.join(', '),
  });

/** Runs the modeler's `commandStack.changed` listeners, the way an edit to the diagram does. */
const notifyDiagramChanged = (): void =>
  modelerOnMock.mock.calls
    .filter(([eventName]) => eventName === 'commandStack.changed')
    .forEach(([, listener]) => listener());

type TestElement = ProcessShapeElement & { outgoing: ProcessShapeFlow[] };

const createSequenceFlow = (target?: ProcessShapeElement): ProcessShapeFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (id: string, outgoingFlowCount: number): TestElement => ({
  id,
  type: BpmnTypeEnum.ExclusiveGateway,
  outgoing: Array.from({ length: outgoingFlowCount }, () => createSequenceFlow()),
});

const createTask = (successors: ProcessShapeElement[]): TestElement => ({
  id: 'FiksArkivTask_1',
  type: BpmnTypeEnum.ServiceTask,
  outgoing: successors.map((successor) => createSequenceFlow(successor)),
});

const renderFiksArkivProcessShapeAlert = (task: TestElement): RenderResult =>
  renderWithProviders(<FiksArkivProcessShapeAlert />, {
    bpmnContextProps: {
      bpmnDetails: {
        ...mockBpmnDetails,
        taskType: 'fiksArkiv',
        element: task as unknown as Element,
      },
    },
  });
