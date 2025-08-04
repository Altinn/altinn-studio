import { generateRandomId } from 'app-shared/utils/generateRandomId';

const supportedEntries = ['create.exclusive-gateway', 'create.start-event', 'create.end-event'];

class SupportedPaletteProvider {
  constructor(bpmnFactory, create, elementFactory, palette, translate, modeling) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.modeling = modeling;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const { elementFactory, create, bpmnFactory, translate, modeling } = this;

    function createCustomTask(taskType) {
      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
            }),
          ],
        });

        modeling.updateProperties(task, {
          extensionElements,
        });

        create.start(event, task);
      };
    }

    function createCustomSigningTask() {
      const taskType = 'signing';

      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              actions: bpmnFactory.create('altinn:Actions', {
                action: [
                  bpmnFactory.create('altinn:Action', {
                    action: 'sign',
                  }),
                  bpmnFactory.create('altinn:Action', {
                    action: 'reject',
                  }),
                ],
              }),
              signatureConfig: bpmnFactory.create('altinn:SignatureConfig', {
                dataTypesToSign: bpmnFactory.create('altinn:DataTypesToSign', {
                  dataTypes: [],
                }),
                signatureDataType: `signatures-${generateRandomId(4)}`,
                runDefaultValidator: true,
              }),
            }),
          ],
        });

        modeling.updateProperties(task, {
          extensionElements,
        });

        create.start(event, task);
      };
    }

    function createUserControlledSigningTask() {
      const taskType = 'userControlledSigning';

      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              actions: bpmnFactory.create('altinn:Actions', {
                action: [
                  bpmnFactory.create('altinn:Action', { action: 'sign' }),
                  bpmnFactory.create('altinn:Action', { action: 'reject' }),
                ],
              }),
              signatureConfig: bpmnFactory.create('altinn:SignatureConfig', {
                dataTypesToSign: bpmnFactory.create('altinn:DataTypesToSign', {
                  dataTypes: [],
                }),
                signatureDataType: `user-controlled-signatures-${generateRandomId(4)}`,
                signeeStatesDataTypeId: `signees-states-${generateRandomId(4)}`,
                signeeProviderId: '', // No default interface exists in the apps
                signingPdfDataType: `signatures-pdf-${generateRandomId(4)}`,
                correspondenceResource: '', // No default
                runDefaultValidator: true,
              }),
            }),
          ],
        });

        modeling.updateProperties(task, {
          extensionElements,
        });

        create.start(event, task);
      };
    }

    function createCustomConfirmationTask() {
      const taskType = 'confirmation';

      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              actions: bpmnFactory.create('altinn:Actions', {
                action: [
                  bpmnFactory.create('altinn:Action', {
                    action: 'confirm',
                  }),
                ],
              }),
            }),
          ],
        });

        modeling.updateProperties(task, {
          extensionElements,
        });

        create.start(event, task);
      };
    }

    function createCustomPaymentTask() {
      const taskType = 'payment';

      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              actions: bpmnFactory.create('altinn:Actions', {
                action: [
                  bpmnFactory.create('altinn:Action', {
                    action: 'pay',
                  }),
                  bpmnFactory.create('altinn:Action', {
                    action: 'reject',
                  }),
                  bpmnFactory.create('altinn:Action', {
                    action: 'confirm',
                  }),
                ],
              }),
              paymentConfig: bpmnFactory.create('altinn:PaymentConfig', {
                paymentDataType: `paymentInformation-${generateRandomId(4)}`,
                paymentReceiptPdfDataType: `paymentReceiptPdf-${generateRandomId(4)}`,
              }),
            }),
          ],
        });

        modeling.updateProperties(task, {
          extensionElements,
        });

        create.start(event, task);
      };
    }

    const buildAltinnTask = (taskType) => {
      const businessObject = bpmnFactory.create('bpmn:Task', {
        name: `Altinn ${taskType} task`,
      });

      const task = elementFactory.createShape({
        type: 'bpmn:Task',
        businessObject,
      });

      return task;
    };

    return (entries) => {
      this._deleteUnsupportedEntries(entries);
      const customEntries = {
        'create.altinn-data-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-data-task',
          title: translate('Create Altinn data task'),
          action: {
            click: createCustomTask('data'),
            dragstart: createCustomTask('data'),
          },
        },
        'create.altinn-feedback-task': {
          group: 'activity',
          title: translate('Create Altinn feedback task'),
          className: 'bpmn-icon-task-generic bpmn-icon-feedback-task',
          action: {
            click: createCustomTask('feedback'),
            dragstart: createCustomTask('feedback'),
          },
        },
        'create.altinn-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-signing-task',
          title: translate('Create Altinn signing task'),
          action: {
            click: createCustomSigningTask(),
            dragstart: createCustomSigningTask(),
          },
        },
        'create.altinn-user-controlled-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-user-controlled-signing-task',
          title: translate('Create Altinn user-controlled signing task'),
          action: {
            click: createUserControlledSigningTask(),
            dragstart: createUserControlledSigningTask(),
          },
        },
        'create.altinn-confirmation-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-confirmation-task',
          title: translate('Create Altinn confirm task'),
          action: {
            click: createCustomConfirmationTask(),
            dragstart: createCustomConfirmationTask(),
          },
        },
        'create.altinn-payment-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-payment-task`,
          title: translate('Create Altinn payment task'),
          action: {
            click: createCustomPaymentTask(),
            dragstart: createCustomPaymentTask(),
          },
        },
      };
      return {
        ...entries,
        ...customEntries,
      };
    };
  }

  // "_" (underscore) is a convention for private methods in JavaScript
  _deleteUnsupportedEntries(entries) {
    const entriesToDelete = this._getUnsupportedEntries(entries);
    entriesToDelete.forEach((entry) => {
      delete entries[entry];
    });
  }

  _getUnsupportedEntries(entries) {
    return Object.keys(entries).filter(this._isUnsupportedEntry);
  }

  _isUnsupportedEntry(entry) {
    return !supportedEntries.includes(entry);
  }
}

SupportedPaletteProvider.$inject = [
  'bpmnFactory',
  'create',
  'elementFactory',
  'palette',
  'translate',
  'modeling',
];

export default {
  __init__: ['supportedPaletteProvider'],
  supportedPaletteProvider: ['type', SupportedPaletteProvider],
};
