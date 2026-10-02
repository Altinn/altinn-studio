import EventBus from 'diagram-js/lib/core/EventBus';
import { Injector } from 'didi';
import { ReadOnlyCommandStack } from './ReadOnlyCommandStack';

describe('ReadOnlyCommandStack', () => {
  it('blocks commands until editing resumes', () => {
    const { commandStack, execute } = setupCommandStack();
    commandStack.readOnly = true;

    expect(commandStack.canExecute('test', {})).toBe(false);
    commandStack.execute('test', {});
    expect(execute).not.toHaveBeenCalled();

    commandStack.readOnly = false;
    expect(commandStack.canExecute('test', {})).toBe(true);
    commandStack.execute('test', {});
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('preserves undo and redo history while editing is blocked', () => {
    const { commandStack, execute, revert } = setupCommandStack();
    commandStack.execute('test', {});
    commandStack.readOnly = true;

    expect(commandStack.canUndo()).toBe(false);
    commandStack.undo();
    expect(revert).not.toHaveBeenCalled();

    commandStack.readOnly = false;
    expect(commandStack.canUndo()).toBe(true);
    commandStack.undo();
    expect(revert).toHaveBeenCalledTimes(1);

    commandStack.readOnly = true;
    expect(commandStack.canRedo()).toBe(false);
    commandStack.redo();
    expect(execute).toHaveBeenCalledTimes(1);

    commandStack.readOnly = false;
    expect(commandStack.canRedo()).toBe(true);
    commandStack.redo();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

function setupCommandStack() {
  const commandStack = new ReadOnlyCommandStack(new EventBus(), new Injector([]));
  const execute = jest.fn();
  const revert = jest.fn();
  commandStack.register('test', { canExecute: () => true, execute, revert });
  return { commandStack, execute, revert };
}
