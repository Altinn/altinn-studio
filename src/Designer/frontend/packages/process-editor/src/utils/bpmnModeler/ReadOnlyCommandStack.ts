import CommandStack from 'diagram-js/lib/command/CommandStack';
import type { CommandContext } from 'diagram-js/lib/command/CommandStack';

export class ReadOnlyCommandStack extends CommandStack {
  public readOnly = false;

  // The base class does not check canExecute, canUndo or canRedo before making changes.
  public execute(command: string, context: CommandContext): void {
    if (!this.readOnly) super.execute(command, context);
  }

  public undo(): void {
    if (!this.readOnly) super.undo();
  }

  public redo(): void {
    if (!this.readOnly) super.redo();
  }

  public canExecute(command: string, context: CommandContext): boolean {
    return !this.readOnly && super.canExecute(command, context);
  }

  public canUndo(): boolean {
    return !this.readOnly && super.canUndo();
  }

  public canRedo(): boolean {
    return !this.readOnly && super.canRedo();
  }
}
