import BpmnModdle from 'bpmn-moddle';
import { SupportedPaletteProvider } from './SupportedPaletteProvider';
import { altinnCustomTasks } from '../extensions/altinnCustomTasks';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('app-shared/utils/generateRandomId', () => {
  let counter = 0;
  return { generateRandomId: () => String(++counter) };
});

const taskTypes = [
  ['data', 'data', 'bpmn:Task'],
  ['feedback', 'feedback', 'bpmn:Task'],
  ['signing', 'signing', 'bpmn:Task'],
  ['user-controlled-signing', 'signing', 'bpmn:Task'],
  ['confirmation', 'confirmation', 'bpmn:Task'],
  ['payment', 'payment', 'bpmn:Task'],
  ['pdf', 'pdf', 'bpmn:ServiceTask'],
  ['eformidling', 'eFormidling', 'bpmn:ServiceTask'],
  ['subform-pdf', 'subformPdf', 'bpmn:ServiceTask'],
  ['fiks-arkiv', 'fiksArkiv', 'bpmn:ServiceTask'],
  ['custom-service', '', 'bpmn:ServiceTask'],
];

describe('SupportedPaletteProvider', () => {
  it('keeps supported BPMN entries and translates their labels', () => {
    const { provider } = createProvider();
    const result = provider.getPaletteEntries()({
      'create.task': {},
      'create.subprocess-expanded': {},
      'create.start-event': { className: 'bpmn-icon-start-event-none' },
      'create.end-event': {},
      'create.exclusive-gateway': {},
    });

    expect(result['create.task']).toBeUndefined();
    expect(result['create.subprocess-expanded']).toBeUndefined();
    expect(result['create.start-event']).toEqual({
      title: textMock('process_editor.palette_create_start_event'),
      className: 'bpmn-icon-start-event-none',
    });
    expect(result['create.end-event'].title).toBe(
      textMock('process_editor.palette_create_end_event'),
    );
    expect(result['create.exclusive-gateway']).toEqual({
      title: textMock('process_editor.palette_create_exclusive_gateway'),
      className: 'bpmn-icon-gateway-xor',
    });
    expect(Object.keys(result)).toHaveLength(taskTypes.length + 3);
  });

  it.each(taskTypes)(
    'creates a configured %s task for both click and drag',
    async (id, taskType, type) => {
      const { provider, start, moddle } = createProvider();
      const entry = provider.getPaletteEntries()({})[`create.altinn-${id}-task`];

      for (const action of ['click', 'dragstart']) {
        const event = {};
        entry.action[action](event);
        const [receivedEvent, shape] = start.mock.lastCall;
        expect(receivedEvent).toBe(event);
        expect(shape.type).toBe(type);
        const extension = shape.businessObject.extensionElements.values[0];
        expect(extension.taskType).toBe(taskType);
        // The configuration must belong to the shape handed to bpmn-js, not an unattached mock object.
        const { xml } = await moddle.toXML(shape.businessObject);
        expect(xml).toContain('<altinn:taskExtension>');
        if (taskType) expect(xml).toContain(`<altinn:taskType>${taskType}</altinn:taskType>`);
      }
    },
  );

  it.each([
    ['pdf', 'pdfConfig'],
    ['eformidling', 'eFormidlingConfig'],
    ['subform-pdf', 'subformPdfConfig'],
  ])('seeds the %s configuration on each new task', (id, property) => {
    const { provider, start } = createProvider();
    const entry = provider.getPaletteEntries()({})[`create.altinn-${id}-task`];
    entry.action.click({});
    entry.action.click({});
    const first = start.mock.calls[0][1].businessObject.extensionElements.values[0][property];
    const second = start.mock.calls[1][1].businessObject.extensionElements.values[0][property];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });

  it('seeds signing actions and the delegated signing data types', () => {
    const { provider, start } = createProvider();
    provider.getPaletteEntries()({})['create.altinn-user-controlled-signing-task'].action.click({});
    const extension = start.mock.lastCall[1].businessObject.extensionElements.values[0];
    expect(extension.actions.action.map(({ action }) => action)).toEqual(['sign', 'reject']);
    expect(extension.signatureConfig).toMatchObject({
      signatureDataType: expect.stringMatching(/^user-controlled-signatures-/),
      signeeStatesDataTypeId: expect.stringMatching(/^signees-states-/),
      signingPdfDataType: expect.stringMatching(/^signatures-pdf-/),
      signeeProviderId: '',
      runDefaultValidator: { value: true },
    });
  });

  it('seeds payment actions and distinct data types for each new payment task', () => {
    const { provider, start } = createProvider();
    const entry = provider.getPaletteEntries()({})['create.altinn-payment-task'];
    entry.action.click({});
    entry.action.click({});
    const first = start.mock.calls[0][1].businessObject.extensionElements.values[0];
    const second = start.mock.calls[1][1].businessObject.extensionElements.values[0];
    expect(first.actions.action.map(({ action }) => action)).toEqual(['pay', 'reject', 'confirm']);
    expect(first.paymentConfig.paymentDataType).not.toBe(second.paymentConfig.paymentDataType);
    expect(first.paymentConfig.paymentReceiptPdfDataType).not.toBe(
      second.paymentConfig.paymentReceiptPdfDataType,
    );
  });
});

function createProvider() {
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const start = jest.fn();
  const palette = { registerProvider: jest.fn() };
  const provider = new SupportedPaletteProvider(
    moddle,
    { start },
    { createShape: (shape: object) => shape },
    palette,
  );
  return { provider, start, moddle };
}
