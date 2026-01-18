import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Element } from 'bpmn-js/lib/model/Types';
import type { CommandHandler } from 'diagram-js/lib/command/CommandStack';
import type CommandStack from 'diagram-js/lib/command/CommandStack';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

export type UpdateTaskIdContext = {
  element: Element;
  newId: string;
};

class UpdateTaskIdCommandHandler implements CommandHandler {
  static $inject = ['modeling', 'elementRegistry', 'commandStack'];

  private modeling: Modeling;
  private elementRegistry: ElementRegistry;

  constructor(modeling: Modeling, elementRegistry: ElementRegistry, commandStack: CommandStack) {
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;

    commandStack.register('updateTaskId', this);
  }

  preExecute(context: UpdateTaskIdContext) {
    const { element, newId } = context;
    const oldId = element.id;

    this.modeling.updateProperties(element, { id: newId });

    this.updateAutoPdfTaskIds(oldId, newId);
  }

  private updateAutoPdfTaskIds(oldId: string, newId: string) {
    const pdfTasks = this.elementRegistry.filter(
      (element) =>
        element.type === 'bpmn:ServiceTask' &&
        element.businessObject.extensionElements?.values[0]?.taskType === 'pdf',
    ) as Element[];

    pdfTasks.forEach((pdfTask) => {
      const taskIds: { value: string }[] =
        pdfTask.businessObject.extensionElements.values[0].pdfConfig?.autoPdfTaskIds?.taskIds;

      if (!taskIds) {
        return;
      }

      taskIds.forEach((taskId) => {
        if (taskId.value === oldId) {
          this.modeling.updateModdleProperties(pdfTask, taskId, {
            value: newId,
          });
        }
      });
    });
  }
}

export default {
  __init__: ['updateTaskIdCommandHandler'],
  updateTaskIdCommandHandler: ['type', UpdateTaskIdCommandHandler],
};
