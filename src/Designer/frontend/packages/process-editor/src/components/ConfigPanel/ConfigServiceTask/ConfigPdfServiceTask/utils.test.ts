import type { Element } from 'bpmn-js/lib/model/Types';
import { getAvailableTasks, filterCurrentTaskIds, generateTextResourceId } from './utils';

describe('ConfigPdfServiceTask utils', () => {
  describe('getAvailableTasks', () => {
    it('should return tasks with id and name', () => {
      const tasks = [
        { id: 'task_1', businessObject: { name: 'Task 1' } },
        { id: 'task_2', businessObject: { name: 'Task 2' } },
      ] as Element[];

      const result = getAvailableTasks(tasks);

      expect(result).toEqual([
        { id: 'task_1', name: 'Task 1' },
        { id: 'task_2', name: 'Task 2' },
      ]);
    });

    it('should return empty string for name when businessObject.name is undefined', () => {
      const tasks = [{ id: 'task_1', businessObject: {} }] as Element[];

      const result = getAvailableTasks(tasks);

      expect(result).toEqual([{ id: 'task_1', name: '' }]);
    });

    it('should return empty string for name when businessObject is undefined', () => {
      const tasks = [{ id: 'task_1' }] as Element[];

      const result = getAvailableTasks(tasks);

      expect(result).toEqual([{ id: 'task_1', name: '' }]);
    });

    it('should return empty array when no tasks are provided', () => {
      const result = getAvailableTasks([]);

      expect(result).toEqual([]);
    });
  });

  describe('filterCurrentTaskIds', () => {
    it('should return task ids that exist in availableTaskIds', () => {
      const pdfConfig = {
        autoPdfTaskIds: {
          taskIds: [{ value: 'task_1' }, { value: 'task_2' }, { value: 'task_3' }],
        },
      };
      const availableTaskIds = ['task_1', 'task_3'];

      const result = filterCurrentTaskIds(pdfConfig, availableTaskIds);

      expect(result).toEqual(['task_1', 'task_3']);
    });

    it('should return empty array when autoPdfTaskIds is undefined', () => {
      const pdfConfig = {};
      const availableTaskIds = ['task_1', 'task_2'];

      const result = filterCurrentTaskIds(pdfConfig, availableTaskIds);

      expect(result).toEqual([]);
    });

    it('should return empty array when taskIds is undefined', () => {
      const pdfConfig = {
        autoPdfTaskIds: {},
      };
      const availableTaskIds = ['task_1', 'task_2'];

      const result = filterCurrentTaskIds(pdfConfig, availableTaskIds);

      expect(result).toEqual([]);
    });

    it('should return empty array when no task ids match available task ids', () => {
      const pdfConfig = {
        autoPdfTaskIds: {
          taskIds: [{ value: 'non_existent_task' }],
        },
      };
      const availableTaskIds = ['task_1', 'task_2'];

      const result = filterCurrentTaskIds(pdfConfig, availableTaskIds);

      expect(result).toEqual([]);
    });

    it('should return empty array when taskIds array is empty', () => {
      const pdfConfig = {
        autoPdfTaskIds: {
          taskIds: [],
        },
      };
      const availableTaskIds = ['task_1', 'task_2'];

      const result = filterCurrentTaskIds(pdfConfig, availableTaskIds);

      expect(result).toEqual([]);
    });

    it('should return empty array when availableTaskIds is empty', () => {
      const pdfConfig = {
        autoPdfTaskIds: {
          taskIds: [{ value: 'task_1' }],
        },
      };

      const result = filterCurrentTaskIds(pdfConfig, []);

      expect(result).toEqual([]);
    });
  });

  describe('generateTextResourceId', () => {
    it('should return id with pdf-filename prefix', () => {
      const result = generateTextResourceId();

      expect(result).toMatch(/^pdf-filename-/);
    });

    it('should return unique ids on each call', () => {
      const result1 = generateTextResourceId();
      const result2 = generateTextResourceId();

      expect(result1).not.toBe(result2);
    });
  });
});
