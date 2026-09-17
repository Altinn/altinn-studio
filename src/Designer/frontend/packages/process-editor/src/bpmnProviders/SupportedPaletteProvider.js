import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { t } from 'i18next';

const supportedEntries = ['create.exclusive-gateway', 'create.start-event', 'create.end-event'];

class SupportedPaletteProvider {
  constructor(bpmnFactory, create, elementFactory, palette, modeling) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.modeling = modeling;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const { elementFactory, create, bpmnFactory, modeling } = this;

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

    function createAltinnServiceTask(taskType, name, buildTaskExtension = () => ({})) {
      return function (event) {
        const task = buildAltinnServiceTask(taskType, name);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType,
              ...buildTaskExtension(),
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
      return createAltinnServiceTask('pdf', undefined, () => ({
        pdfConfig: bpmnFactory.create('altinn:PdfConfig'),
      }));
    }

    function createEFormidlingServiceTask() {
      return createAltinnServiceTask('eFormidling', undefined, () => ({
        eFormidlingConfig: bpmnFactory.create('altinn:EFormidlingConfig'),
      }));
    }

    function createSubformPdfServiceTask() {
      return createAltinnServiceTask('subformPdf', undefined, () => ({
        subformPdfConfig: bpmnFactory.create('altinn:SubformPdfConfig'),
      }));
    }

    // Fiks Arkiv is configured in appsettings, so the task type is all the bpmn carries.
    function createFiksArkivServiceTask() {
      return createAltinnServiceTask('fiksArkiv');
    }

    // A service task the app implements itself; the developer fills in the registered type.
    function createCustomServiceTask() {
      return createAltinnServiceTask('', 'Altinn service task');
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

    const buildAltinnServiceTask = (taskType, name = `Altinn ${taskType} task`) => {
      const businessObject = bpmnFactory.create('bpmn:ServiceTask', {
        name,
      });

      const task = elementFactory.createShape({
        type: 'bpmn:ServiceTask',
        businessObject,
      });

      return task;
    };

    return (entries) => {
      this._deleteUnsupportedEntries(entries);
      this._overrideSupportedEntries(entries);
      const customEntries = {
        'create.altinn-data-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-data-task',
          title: t('process_editor.palette_create_data_task'),
          action: {
            click: createCustomTask('data'),
            dragstart: createCustomTask('data'),
          },
        },
        'create.altinn-feedback-task': {
          group: 'activity',
          title: t('process_editor.palette_create_feedback_task'),
          className: 'bpmn-icon-task-generic bpmn-icon-feedback-task',
          action: {
            click: createCustomTask('feedback'),
            dragstart: createCustomTask('feedback'),
          },
        },
        'create.altinn-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-signing-task',
          title: t('process_editor.palette_create_signing_task'),
          action: {
            click: createCustomSigningTask(),
            dragstart: createCustomSigningTask(),
          },
        },
        'create.altinn-user-controlled-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-user-controlled-signing-task',
          title: t('process_editor.palette_create_user_controlled_signing_task'),
          action: {
            click: createUserControlledSigningTask(),
            dragstart: createUserControlledSigningTask(),
          },
        },
        'create.altinn-confirmation-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-confirmation-task',
          title: t('process_editor.palette_create_confirmation_task'),
          action: {
            click: createCustomConfirmationTask(),
            dragstart: createCustomConfirmationTask(),
          },
        },
        'create.altinn-payment-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-payment-task`,
          title: t('process_editor.palette_create_payment_task'),
          action: {
            click: createCustomPaymentTask(),
            dragstart: createCustomPaymentTask(),
          },
        },
        'create.altinn-pdf-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-pdf-task`,
          title: t('process_editor.palette_create_pdf_service_task'),
          action: {
            click: createCustomPdfServiceTask(),
            dragstart: createCustomPdfServiceTask(),
          },
        },
        'create.altinn-eformidling-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-eformidling-task`,
          title: t('process_editor.palette_create_eformidling_service_task'),
          action: {
            click: createEFormidlingServiceTask(),
            dragstart: createEFormidlingServiceTask(),
          },
        },
        'create.altinn-subform-pdf-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-subform-pdf-task`,
          title: t('process_editor.palette_create_subform_pdf_service_task'),
          action: {
            click: createSubformPdfServiceTask(),
            dragstart: createSubformPdfServiceTask(),
          },
        },
        'create.altinn-fiks-arkiv-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-fiks-arkiv-task`,
          title: t('process_editor.palette_create_fiks_arkiv_service_task'),
          action: {
            click: createFiksArkivServiceTask(),
            dragstart: createFiksArkivServiceTask(),
          },
        },
        'create.altinn-custom-service-task': {
          group: 'activity',
          className: `bpmn-icon-task-generic bpmn-icon-custom-service-task`,
          title: t('process_editor.palette_create_custom_service_task'),
          action: {
            click: createCustomServiceTask(),
            dragstart: createCustomServiceTask(),
          },
        },
      };
      return {
        ...entries,
        ...customEntries,
      };
    };
  }

  // bpmn-js titles its own entries in English, and its gateway entry carries the generic diamond
  // although it creates an exclusive gateway.
  _overrideSupportedEntries(entries) {
    const supportedEntryOverrides = {
      'create.start-event': { title: t('process_editor.palette_create_start_event') },
      'create.end-event': { title: t('process_editor.palette_create_end_event') },
      'create.exclusive-gateway': {
        title: t('process_editor.palette_create_exclusive_gateway'),
        className: 'bpmn-icon-gateway-xor',
      },
    };

    Object.entries(supportedEntryOverrides).forEach(([entryName, override]) => {
      if (entries[entryName]) Object.assign(entries[entryName], override);
    });
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
  'modeling',
];

export default {
  __init__: ['supportedPaletteProvider'],
  supportedPaletteProvider: ['type', SupportedPaletteProvider],
};
