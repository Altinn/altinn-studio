const supportedEntries = [
  'create.exclusive-gateway',
  'create.start-event',
  'create.end-event',
  'create.task',
];

class SupportedPaletteProvider {
  constructor(bpmnFactory, create, elementFactory, palette, translate) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const { elementFactory, create, bpmnFactory, translate } = this;

    function createTask(taskType) {
      return function (event) {
        const businessObject = bpmnFactory.create('bpmn:Task');

        console.log(businessObject)
        businessObject.taskType = taskType;
        console.log(businessObject.taskType)

        const shape = elementFactory.createShape({
          type: 'bpmn:Task',
          businessObject: businessObject,
        });

        create.start(event, shape);
        console.log(event);
      };
    }

    return (entries) => {
      this._deleteUnsupportedEntries(entries);
      const customEntries = {
        'create.altinn-data-task': {
          group: 'activity',
          className: 'bpmn-icon-task red',
          title: translate('Create Altinn Data Task'),
          action: {
            dragstart: createTask('data'),
            click: createTask('data'),
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
];

export default {
  __init__: ['supportedPaletteProvider'],
  supportedPaletteProvider: ['type', SupportedPaletteProvider],
};
