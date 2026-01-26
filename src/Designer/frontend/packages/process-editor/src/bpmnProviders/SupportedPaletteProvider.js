import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { getAppLibVersion } from '../utils/bpmnModeler/BpmnModelerInstance';
import {
  isVersionEqualOrGreater,
  MINIMUM_VERSION_FOR_PDF_SERVICE_TASK,
} from '../utils/processEditorUtils';

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
                runDefaultValidator: bpmnFactory.create('altinn:RunDefaultValidator', {
                  value: true,
                }),
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
      const taskType = 'signing';

      return function (event) {
        const task = buildAltinnTask(`user-controlled ${taskType}`);

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
                runDefaultValidator: bpmnFactory.create('altinn:RunDefaultValidator', {
                  value: true,
                }),
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

    function createCustomPdfServiceTask() {
      const taskType = 'pdf';

      return function (event) {
        const appLibVersion = getAppLibVersion();
        if (!isVersionEqualOrGreater(appLibVersion, MINIMUM_VERSION_FOR_PDF_SERVICE_TASK)) {
          window.alert(
            translate('process_editor.palette_pdf_service_task_version_error', {
              version: MINIMUM_VERSION_FOR_PDF_SERVICE_TASK,
            }),
          );
          return;
        }

        const task = buildAltinnServiceTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              pdfConfig: bpmnFactory.create('altinn:PdfConfig'),
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

    const buildAltinnServiceTask = (taskType) => {
      const businessObject = bpmnFactory.create('bpmn:ServiceTask', {
        name: `Altinn ${taskType} task`,
      });

      const task = elementFactory.createShape({
        type: 'bpmn:ServiceTask',
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
          title: translate('process_editor.palette_create_data_task'),
          action: {
            click: createCustomTask('data'),
            dragstart: createCustomTask('data'),
          },
        },
        'create.altinn-feedback-task': {
          group: 'activity',
          title: translate('process_editor.palette_create_feedback_task'),
          className: 'bpmn-icon-task-generic bpmn-icon-feedback-task',
          action: {
            click: createCustomTask('feedback'),
            dragstart: createCustomTask('feedback'),
          },
        },
        'create.altinn-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-signing-task',
          title: translate('process_editor.palette_create_signing_task'),
          action: {
            click: createCustomSigningTask(),
            dragstart: createCustomSigningTask(),
          },
        },
        'create.altinn-user-controlled-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-user-controlled-signing-task',
          title: translate('process_editor.palette_create_user_controlled_signing_task'),
          action: {
            click: createUserControlledSigningTask(),
            dragstart: createUserControlledSigningTask(),
          },
        },
        'create.altinn-confirmation-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-confirmation-task',
          title: translate('process_editor.palette_create_confirmation_task'),
          action: {
            click: createCustomConfirmationTask(),
            dragstart: createCustomConfirmationTask(),
          },
        },
        'create.altinn-payment-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-payment-task`,
          title: translate('process_editor.palette_create_payment_task'),
          action: {
            click: createCustomPaymentTask(),
            dragstart: createCustomPaymentTask(),
          },
        },
        'create.altinn-pdf-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-pdf-task`,
          title: translate('process_editor.palette_create_pdf_service_task'),
          action: {
            click: createCustomPdfServiceTask(),
            dragstart: createCustomPdfServiceTask(),
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
