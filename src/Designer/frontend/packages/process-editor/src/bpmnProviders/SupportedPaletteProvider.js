import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { t } from 'i18next';

const supportedEntries = {
  'create.start-event': 'process_editor.palette_create_start_event',
  'create.end-event': 'process_editor.palette_create_end_event',
  'create.exclusive-gateway': 'process_editor.palette_create_exclusive_gateway',
};

export class SupportedPaletteProvider {
  constructor(bpmnFactory, create, elementFactory, palette) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const factory = this.bpmnFactory;
    const actions = (...names) =>
      factory.create('altinn:Actions', {
        action: names.map((action) => factory.create('altinn:Action', { action })),
      });
    const signingConfig = (userControlled = false) => ({
      actions: actions('sign', 'reject'),
      signatureConfig: factory.create('altinn:SignatureConfig', {
        dataTypesToSign: factory.create('altinn:DataTypesToSign', { dataTypes: [] }),
        signatureDataType: `${userControlled ? 'user-controlled-' : ''}signatures-${generateRandomId(4)}`,
        runDefaultValidator: factory.create('altinn:RunDefaultValidator', { value: true }),
        ...(userControlled && {
          signeeStatesDataTypeId: `signees-states-${generateRandomId(4)}`,
          signeeProviderId: '',
          signingPdfDataType: `signatures-pdf-${generateRandomId(4)}`,
        }),
      }),
    });

    const tasks = [
      { id: 'data', taskType: 'data' },
      { id: 'feedback', taskType: 'feedback' },
      { id: 'signing', taskType: 'signing', configure: () => signingConfig() },
      {
        id: 'user-controlled-signing',
        taskType: 'signing',
        name: 'Altinn user-controlled signing task',
        configure: () => signingConfig(true),
      },
      {
        id: 'confirmation',
        taskType: 'confirmation',
        configure: () => ({ actions: actions('confirm') }),
      },
      {
        id: 'payment',
        taskType: 'payment',
        configure: () => ({
          actions: actions('pay', 'reject', 'confirm'),
          paymentConfig: factory.create('altinn:PaymentConfig', {
            paymentDataType: `paymentInformation-${generateRandomId(4)}`,
            paymentReceiptPdfDataType: `paymentReceiptPdf-${generateRandomId(4)}`,
          }),
        }),
      },
    ];
    const serviceTasks = [
      {
        id: 'pdf',
        taskType: 'pdf',
        configure: () => ({ pdfConfig: factory.create('altinn:PdfConfig') }),
      },
      {
        id: 'eformidling',
        taskType: 'eFormidling',
        configure: () => ({ eFormidlingConfig: factory.create('altinn:EFormidlingConfig') }),
      },
      {
        id: 'subform-pdf',
        taskType: 'subformPdf',
        configure: () => ({ subformPdfConfig: factory.create('altinn:SubformPdfConfig') }),
      },
      { id: 'fiks-arkiv', taskType: 'fiksArkiv' },
      { id: 'custom-service', taskType: '', name: 'Altinn service task' },
    ];

    return (entries) => {
      for (const entry of Object.keys(entries)) {
        if (!(entry in supportedEntries)) delete entries[entry];
      }
      for (const [entry, titleKey] of Object.entries(supportedEntries)) {
        if (entries[entry]) entries[entry].title = t(titleKey);
      }
      if (entries['create.exclusive-gateway']) {
        entries['create.exclusive-gateway'].className = 'bpmn-icon-gateway-xor';
      }
      for (const task of tasks) {
        entries[`create.altinn-${task.id}-task`] = this.createTaskEntry(task, 'bpmn:Task');
      }
      for (const task of serviceTasks) {
        entries[`create.altinn-${task.id}-task`] = this.createTaskEntry(task, 'bpmn:ServiceTask');
      }
      return entries;
    };
  }

  createTaskEntry({ id, taskType, name = `Altinn ${taskType} task`, configure }, type) {
    const createTask = (event) => {
      const businessObject = this.bpmnFactory.create(type, {
        name,
        extensionElements: this.bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            this.bpmnFactory.create('altinn:TaskExtension', {
              taskType,
              ...configure?.(),
            }),
          ],
        }),
      });
      // Configure the detached shape before placement; preparing a task must not create an undo entry.
      this.create.start(event, this.elementFactory.createShape({ type, businessObject }));
    };
    const titleSuffix =
      type === 'bpmn:ServiceTask' && id !== 'custom-service' ? 'service_task' : 'task';
    return {
      group: 'activity',
      className: `bpmn-icon-task-generic bpmn-icon-${id}-task`,
      title: t(`process_editor.palette_create_${id.replaceAll('-', '_')}_${titleSuffix}`),
      action: { click: createTask, dragstart: createTask },
    };
  }
}

SupportedPaletteProvider.$inject = ['bpmnFactory', 'create', 'elementFactory', 'palette'];

export default {
  __init__: ['supportedPaletteProvider'],
  supportedPaletteProvider: ['type', SupportedPaletteProvider],
};
