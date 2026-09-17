import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BpmnModdle from 'bpmn-moddle';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type { FiksArkivRouting } from 'app-shared/types/FiksArkivRouting';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import { ConfigSequenceFlow } from '../ConfigSequenceFlow';
import { ConfigGateway } from '../ConfigGateway';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';

const defaults: FiksArkivRouting = {
  successAction: null,
  failureAction: 'reject',
  unavailableReason: null,
};
const text = (key: string) => textMock(`process_editor.fiks_arkiv_routing.${key}`);

describe('Fiks Arkiv routing controls', () => {
  afterEach(jest.restoreAllMocks);

  it('saves a chosen outcome as BPMN and preserves the existing arrow name', async () => {
    const user = userEvent.setup();
    const { flow, moddle } = renderRouting();
    await user.click(screen.getByRole('radio', { name: text('success') }));

    const { xml } = await moddle.toXML(flow.businessObject);
    expect(xml).toContain('["notEquals",["gatewayAction"],"reject"]');
    expect(flow.businessObject.name).toBe('Existing branch name');
    expect(screen.getByRole('radio', { name: text('success') })).toBeChecked();
  });

  it('uses custom actions from the app configuration', async () => {
    const user = userEvent.setup();
    const { flow } = renderRouting({
      routing: { ...defaults, successAction: 'archived', failureAction: 'failed' },
    });
    await user.click(screen.getByRole('radio', { name: text('failure') }));
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual([
      'equals',
      ['gatewayAction'],
      'failed',
    ]);
  });

  it('keeps an existing custom expression when opening the manual editor', async () => {
    const expression = ['equals', ['dataModel', 'field'], 'value'];
    const { flow } = renderRouting({ expression });
    expect(screen.getByRole('radio', { name: text('custom') })).toBeChecked();
    expect(screen.getByRole('tab', { name: textMock('expression.manual') })).toBeInTheDocument();
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual(expression);
  });

  it('switches to custom editing without replacing an existing outcome rule', async () => {
    const user = userEvent.setup();
    const expression = ['equals', ['gatewayAction'], 'reject'];
    const { flow } = renderRouting({ expression });
    await user.click(screen.getByRole('radio', { name: text('custom') }));
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual(expression);
    expect(screen.getByRole('tab', { name: textMock('expression.manual') })).toBeInTheDocument();
  });

  it('refreshes the selected outcome after a model change such as undo', () => {
    const { flow, moddle, notifyChange } = renderRouting({
      expression: ['equals', ['gatewayAction'], 'reject'],
    });
    act(() => {
      flow.businessObject.conditionExpression = moddle.create('bpmn:FormalExpression', {
        body: JSON.stringify(['notEquals', ['gatewayAction'], 'reject']),
      });
      notifyChange();
    });
    expect(screen.getByRole('radio', { name: text('success') })).toBeChecked();
  });

  it('keeps manual rules available when the action mapping is unknown', () => {
    renderRouting({
      routing: {
        successAction: null,
        failureAction: null,
        unavailableReason: 'environmentDependent',
      },
    });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(text('unavailable.environmentDependent'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
      }),
    ).toBeEnabled();
  });

  it('preserves malformed JSON and keeps the outcome controls usable', async () => {
    const user = userEvent.setup();
    const rawExpression = '["equals",';
    const { flow } = renderRouting({ rawExpression });
    expect(screen.getByRole('textbox')).toHaveValue(rawExpression);
    expect(flow.businessObject.conditionExpression.body).toBe(rawExpression);
    await user.click(screen.getByRole('radio', { name: text('success') }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual([
      'notEquals',
      ['gatewayAction'],
      'reject',
    ]);
  });

  it('adds and removes rules for ordinary sequence flows', async () => {
    const user = userEvent.setup();
    const { flow } = renderRouting({ panel: 'genericFlow' });
    const addRule = () =>
      screen.getByRole('button', {
        name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
      });
    await user.click(addRule());
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual([
      'equals',
      ['gatewayAction'],
      'reject',
    ]);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: textMock('general.edit') }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(flow.businessObject.conditionExpression).toBeUndefined();
    expect(addRule()).toBeInTheDocument();
  });

  it('shows routes by outcome and destination and lets users select a branch', async () => {
    const user = userEvent.setup();
    const { flow, selection } = renderRouting({
      panel: 'gateway',
      expression: ['equals', ['gatewayAction'], 'reject'],
    });
    await user.click(screen.getByRole('button', { name: `${text('failure')} Fix details` }));
    expect(selection.select).toHaveBeenCalledWith(flow);
  });
});

type Options = {
  expression?: unknown;
  rawExpression?: string;
  routing?: FiksArkivRouting;
  panel?: 'flow' | 'gateway' | 'genericFlow';
};

function renderRouting({
  expression,
  rawExpression,
  routing = defaults,
  panel = 'flow',
}: Options = {}) {
  const moddle = new BpmnModdle();
  const flow: Connection = {
    di: {},
    waypoints: [],
    id: 'Flow_1',
    type: BpmnTypeEnum.SequenceFlow,
    businessObject: moddle.create('bpmn:SequenceFlow', {
      id: 'Flow_1',
      name: 'Existing branch name',
      conditionExpression:
        expression === undefined && rawExpression === undefined
          ? undefined
          : moddle.create('bpmn:FormalExpression', {
              body: rawExpression ?? JSON.stringify(expression),
            }),
    }),
    target: { id: 'NextTask', businessObject: { name: 'Fix details' } },
  } as Connection;
  flow.di = { bpmnElement: flow.businessObject };
  const gateway = {
    labels: [],
    di: {},
    id: 'Gateway_1',
    type: panel === 'genericFlow' ? BpmnTypeEnum.Task : BpmnTypeEnum.ExclusiveGateway,
    businessObject: {},
    outgoing: [flow],
    incoming: [
      {
        source: {
          businessObject: {
            extensionElements: {
              values: [{ $type: 'altinn:TaskExtension', taskType: 'fiksArkiv' }],
            },
          },
        },
      },
    ],
  } as unknown as Element;
  flow.source = gateway;
  const listeners = new Set<() => void>();
  const notifyChange = () => listeners.forEach((listener) => listener());
  const selection = { select: jest.fn() };
  const services = {
    bpmnFactory: moddle,
    moddle,
    selection,
    elementRegistry: { get: (id: string) => (id === flow.id ? flow : gateway) },
    modeling: {
      updateProperties: (_element, properties) => {
        Object.assign(flow.businessObject, properties);
        notifyChange();
      },
    },
  };
  const modeler = {
    get: (name: string) => services[name],
    on: (_event: string, listener: () => void) => listeners.add(listener),
    off: (_event: string, listener: () => void) => listeners.delete(listener),
  } as unknown as Modeler;
  const element = panel === 'gateway' ? gateway : flow;
  renderWithProviders(panel === 'gateway' ? <ConfigGateway /> : <ConfigSequenceFlow />, {
    bpmnContextProps: {
      modelerRef: { current: modeler },
      isInitialized: true,
      bpmnDetails: {
        ...mockBpmnDetails,
        id: element.id,
        type: element.type as BpmnTypeEnum,
        element,
      },
    },
    bpmnApiContextProps: { fiksArkivRouting: routing, allDataModelIds: [] },
  });
  return { flow, moddle, notifyChange, selection };
}
