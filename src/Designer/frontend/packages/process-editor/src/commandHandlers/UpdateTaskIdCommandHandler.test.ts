import UpdateTaskIdCommandHandlerModule from './UpdateTaskIdCommandHandler';
import type { UpdateTaskIdContext } from './UpdateTaskIdCommandHandler';
import type { Element } from 'bpmn-js/lib/model/Types';

const UpdateTaskIdCommandHandler = UpdateTaskIdCommandHandlerModule
  .updateTaskIdCommandHandler[1] as any;

type PdfConfigOptions = {
  taskType?: string;
  pdfConfig?: {
    autoPdfTaskIds?: {
      taskIds: Array<{ value: string }>;
    };
  };
};

const createPdfTask = (options: PdfConfigOptions = { taskType: 'pdf' }): Element =>
  ({
    type: 'bpmn:ServiceTask',
    businessObject: {
      extensionElements: {
        values: [options],
      },
    },
  }) as Element;

const createTaskElement = (id: string = 'task_1'): Element =>
  ({
    id,
    type: 'bpmn:Task',
  }) as Element;

const createContext = (element: Element, newId: string = 'task_renamed'): UpdateTaskIdContext => ({
  element,
  newId,
});

describe('UpdateTaskIdCommandHandler', () => {
  let handler: any;
  let mockModeling: any;
  let mockElementRegistry: any;
  let mockCommandStack: any;

  beforeEach(() => {
    mockModeling = {
      updateProperties: jest.fn(),
      updateModdleProperties: jest.fn(),
    };

    mockElementRegistry = {
      filter: jest.fn(() => []),
    };

    mockCommandStack = {
      register: jest.fn(),
    };

    handler = new UpdateTaskIdCommandHandler(mockModeling, mockElementRegistry, mockCommandStack);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should register the command handler with commandStack', () => {
      expect(mockCommandStack.register).toHaveBeenCalledWith('updateTaskId', handler);
    });

    it('should store modeling and elementRegistry dependencies', () => {
      expect(handler['modeling']).toBe(mockModeling);
      expect(handler['elementRegistry']).toBe(mockElementRegistry);
    });
  });

  describe('preExecute', () => {
    it('should update element id using modeling.updateProperties', () => {
      const element = createTaskElement('oldTaskId');
      const context = createContext(element, 'newTaskId');

      handler.preExecute(context);

      expect(mockModeling.updateProperties).toHaveBeenCalledWith(element, { id: 'newTaskId' });
    });

    it('should call updateAutoPdfTaskIds with old and new ids', () => {
      const element = createTaskElement('task_1');
      const context = createContext(element);
      const updateAutoPdfTaskIdsSpy = jest.spyOn(handler as any, 'updateAutoPdfTaskIds');

      handler.preExecute(context);

      expect(updateAutoPdfTaskIdsSpy).toHaveBeenCalledWith('task_1', 'task_renamed');
    });
  });

  describe('updateAutoPdfTaskIds', () => {
    it('should find all PDF service tasks', () => {
      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockElementRegistry.filter).toHaveBeenCalled();
      const filterFn = mockElementRegistry.filter.mock.calls[0][0];

      const pdfTask = createPdfTask();
      const regularTask = {
        type: 'bpmn:Task',
        businessObject: {
          extensionElements: {
            values: [{ taskType: 'data' }],
          },
        },
      };

      expect(filterFn(pdfTask)).toBe(true);
      expect(filterFn(regularTask)).toBe(false);
    });

    it('should update autoPdfTaskIds when old task id matches', () => {
      const taskId1 = { value: 'task_1' };
      const taskId2 = { value: 'task_2' };
      const pdfTask = createPdfTask({
        taskType: 'pdf',
        pdfConfig: { autoPdfTaskIds: { taskIds: [taskId1, taskId2] } },
      });

      mockElementRegistry.filter.mockReturnValue([pdfTask]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).toHaveBeenCalledWith(pdfTask, taskId1, {
        value: 'task_renamed',
      });
      expect(mockModeling.updateModdleProperties).not.toHaveBeenCalledWith(
        pdfTask,
        taskId2,
        expect.anything(),
      );
    });

    it('should update multiple PDF tasks if they reference the renamed task', () => {
      const taskId1 = { value: 'task_1' };
      const taskId2 = { value: 'task_1' };
      const pdfTask1 = createPdfTask({
        taskType: 'pdf',
        pdfConfig: { autoPdfTaskIds: { taskIds: [taskId1] } },
      });
      const pdfTask2 = createPdfTask({
        taskType: 'pdf',
        pdfConfig: { autoPdfTaskIds: { taskIds: [taskId2] } },
      });

      mockElementRegistry.filter.mockReturnValue([pdfTask1, pdfTask2]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).toHaveBeenCalledTimes(2);
      expect(mockModeling.updateModdleProperties).toHaveBeenCalledWith(pdfTask1, taskId1, {
        value: 'task_renamed',
      });
      expect(mockModeling.updateModdleProperties).toHaveBeenCalledWith(pdfTask2, taskId2, {
        value: 'task_renamed',
      });
    });

    it('should not update if PDF task has no autoPdfTaskIds', () => {
      const pdfTask = createPdfTask({ taskType: 'pdf', pdfConfig: {} });

      mockElementRegistry.filter.mockReturnValue([pdfTask]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).not.toHaveBeenCalled();
    });

    it('should not update if PDF task has no pdfConfig', () => {
      const pdfTask = createPdfTask({ taskType: 'pdf' });

      mockElementRegistry.filter.mockReturnValue([pdfTask]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).not.toHaveBeenCalled();
    });

    it('should not update if task id does not match', () => {
      const taskId1 = { value: 'task_2' };
      const pdfTask = createPdfTask({
        taskType: 'pdf',
        pdfConfig: { autoPdfTaskIds: { taskIds: [taskId1] } },
      });

      mockElementRegistry.filter.mockReturnValue([pdfTask]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).not.toHaveBeenCalled();
    });

    it('should handle empty taskIds array', () => {
      const pdfTask = createPdfTask({
        taskType: 'pdf',
        pdfConfig: { autoPdfTaskIds: { taskIds: [] } },
      });

      mockElementRegistry.filter.mockReturnValue([pdfTask]);

      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      expect(mockModeling.updateModdleProperties).not.toHaveBeenCalled();
    });

    it('should filter correctly for ServiceTask with pdf taskType', () => {
      const element = createTaskElement('task_1');
      const context = createContext(element);

      handler.preExecute(context);

      const filterFn = mockElementRegistry.filter.mock.calls[0][0];

      const serviceTaskWithoutExtension = {
        type: 'bpmn:ServiceTask',
        businessObject: {},
      };

      const serviceTaskWithDifferentType = {
        type: 'bpmn:ServiceTask',
        businessObject: {
          extensionElements: {
            values: [{ taskType: 'data' }],
          },
        },
      };

      expect(filterFn(serviceTaskWithoutExtension)).toBe(false);
      expect(filterFn(serviceTaskWithDifferentType)).toBe(false);
    });
  });

  describe('$inject', () => {
    it('should have correct dependencies in $inject array', () => {
      expect(UpdateTaskIdCommandHandler.$inject).toEqual([
        'modeling',
        'elementRegistry',
        'commandStack',
      ]);
    });
  });

  describe('module export', () => {
    it('should export module with correct structure', () => {
      expect(UpdateTaskIdCommandHandlerModule.__init__).toEqual(['updateTaskIdCommandHandler']);
      expect(UpdateTaskIdCommandHandlerModule.updateTaskIdCommandHandler[0]).toBe('type');
    });
  });
});
