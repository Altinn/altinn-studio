const supportedEntries = [
  'create.exclusive-gateway',
  'create.start-event',
  'create.end-event',
  'create.task',
];

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
        const businessObject = bpmnFactory.create('bpmn:Task', {
          name: `Task with Altinn ${taskType} task`,
        });

        const task = elementFactory.createShape({
          type: 'bpmn:Task',
          businessObject,
        });

        const extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
          values: [
            bpmnFactory.create('altinn:taskExtension', {
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

    return (entries) => {
      this._deleteUnsupportedEntries(entries);
      const customEntries = {
        'create.altinn-data-task': {
          group: 'activity',
          className: 'bpmn-icon-task',
          title: translate('Create Altinn Data Task'),
          action: {
            dragstart: createCustomTask('data'),
            click: createCustomTask('data'),
          },
        },
        'create.altinn-confirmation-task': {
          group: 'activity',
          title: translate('Create Altinn Confirm Task'),
          className: 'bpmn-icon-task',
          action: {
            dragstart: createCustomTask('confirmation'),
            click: createCustomTask('confirmation'),
          },
        },
        'create.altinn-feedback-task': {
          group: 'activity',
          title: translate('Create Altinn Feedback Task'),
          className: 'bpmn-icon-task',
          action: {
            dragstart: createCustomTask('feedback'),
            click: createCustomTask('feedback'),
          },
        },
        'create.altinn-signing-task': {
          group: 'activity',
          className: 'bpmn-icon-task',
          title: translate('Create Altinn signing Task'),
          action: {
            dragstart: createCustomTask('signing'),
            click: createCustomTask('signing'),
          },
        },
      };
      return {
        ...entries,
        ...customEntries,
      };
    };
  }

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
