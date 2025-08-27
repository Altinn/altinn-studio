import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { Queue } from './Queue';

describe('Queue', () => {
  let queue: Queue;
  let callback: jest.Mock;
  jest.useFakeTimers({ advanceTimers: true });

  beforeEach(() => {
    callback = jest.fn();
    queue = new Queue({ timeout: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });
  });

  it('should add tasks to queue', () => {
    queue.addTaskToQueue({ id: 'task1', callback });
    queue.addTaskToQueue({ id: 'task2', callback });
    expect(queue['queue'].length).toBe(2);
  });

  it('should not add task to queue if already in queue', () => {
    queue.addTaskToQueue({ id: 'task1', callback });
    queue.addTaskToQueue({ id: 'task1', callback });
    expect(queue['queue'].length).toBe(1);
  });

  it('should process queue after timeout', () => {
    queue.addTaskToQueue({ id: 'task1', callback });
    queue.addTaskToQueue({ id: 'task2', callback });
    expect(queue['queueTimeoutId']).toBeDefined();
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should empty the queue after processing and set queueTimeoutId to undefined after processing tasks', () => {
    queue.addTaskToQueue({ id: 'task1', callback });
    queue.addTaskToQueue({ id: 'task2', callback });

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    expect(queue['queue'].length).toBe(0);
    expect(queue['queueTimeoutId']).toBeUndefined();
  });
});
