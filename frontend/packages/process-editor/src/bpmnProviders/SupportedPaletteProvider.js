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
                action: ['sign', 'reject'],
              }),
              signatureConfig: bpmnFactory.create('altinn:SignatureConfig', {
                dataTypesToSign: bpmnFactory.create('altinn:DataTypesToSign', {
                  dataType: ['Model'],
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

    function createCustomPaymentTask() {
      const taskType = 'payment';

      return function (event) {
        const task = buildAltinnTask(taskType);

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:TaskExtension', {
              taskType: taskType,
              actions: bpmnFactory.create('altinn:Actions', {
                action: ['pay', 'reject'],
              }),
              paymentConfig: bpmnFactory.create('altinn:PaymentConfig', {
                paymentDataType: bpmnFactory.create('altinn:PaymentDataType', {
                  dataType: ['paymentInformation'],
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
          title: translate('Create Altinn Data Task'),
          action: {
            dragstart: createCustomTask('data'),
          },
        },
        'create.altinn-confirmation-task': {
          group: 'activity',
          title: translate('Create Altinn Confirm Task'),
          className: 'bpmn-icon-task-generic bpmn-icon-confirmation-task',
          action: {
            dragstart: createCustomTask('confirmation'),
          },
        },
        'create.altinn-feedback-task': {
          group: 'activity',
          title: translate('Create Altinn Feedback Task'),
          className: 'bpmn-icon-task-generic bpmn-icon-feedback-task',
          action: {
            dragstart: createCustomTask('feedback'),
          },
        },
        'create.altinn-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-signing-task',
          title: translate('Create Altinn signing Task'),
          action: {
            dragstart: createCustomSigningTask(),
          },
        },
        'create.altinn-payment-task': {
          group: 'activity',
          className: 'bpmn-icon-task-generic bpmn-icon-payment-task',
          title: translate('Payment'),
          action: {
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
