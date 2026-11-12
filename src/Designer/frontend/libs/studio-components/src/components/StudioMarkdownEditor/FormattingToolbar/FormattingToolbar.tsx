import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { StudioButton } from '../../StudioButton';
import type { FormattingCommand, FormattingState } from '../types/FormattingCommand';
import type { StudioMarkdownEditorTexts } from '../types/StudioMarkdownEditorTexts';
import { toolbarButtonGroups } from './toolbarButtons';
import classes from './FormattingToolbar.module.css';

export type FormattingToolbarProps = {
  editorId: string;
  formattingState: FormattingState;
  isCommandDisabled: (command: FormattingCommand) => boolean;
  onCommand: (command: FormattingCommand) => void;
  texts: StudioMarkdownEditorTexts;
};

const allCommands: FormattingCommand[] = toolbarButtonGroups.flat().map(({ command }) => command);

export function FormattingToolbar({
  editorId,
  formattingState,
  isCommandDisabled,
  onCommand,
  texts,
}: FormattingToolbarProps): ReactElement {
  const [focusableCommand, setFocusableCommand] = useState<FormattingCommand>(allCommands[0]);
  const buttonRefs = useRef<Map<FormattingCommand, HTMLButtonElement>>(new Map());

  const moveFocus = (command: FormattingCommand): void => {
    setFocusableCommand(command);
    buttonRefs.current.get(command)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const currentIndex = allCommands.indexOf(focusableCommand);
    const targetIndex = findTargetIndex(event.key, currentIndex, allCommands.length);
    if (targetIndex === null) return;
    event.preventDefault();
    moveFocus(allCommands[targetIndex]);
  };

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>): void =>
    event.preventDefault();

  return (
    <div
      aria-controls={editorId}
      aria-label={texts.toolbarLabel}
      className={classes.toolbar}
      onKeyDown={handleKeyDown}
      role='toolbar'
    >
      {toolbarButtonGroups.map((group) => (
        <div className={classes.group} key={group[0].command}>
          {group.map(({ command, icon }) => (
            <StudioButton
              aria-label={texts[command]}
              aria-pressed={formattingState[command]}
              className={classes.button}
              data-size='sm'
              disabled={isCommandDisabled(command)}
              icon={icon}
              key={command}
              onClick={() => onCommand(command)}
              onFocus={() => setFocusableCommand(command)}
              onMouseDown={keepEditorSelection}
              ref={(element) => {
                if (element) buttonRefs.current.set(command, element);
                else buttonRefs.current.delete(command);
              }}
              tabIndex={command === focusableCommand ? 0 : -1}
              title={texts[command]}
              type='button'
              variant='tertiary'
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function findTargetIndex(key: string, currentIndex: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % count;
    case 'ArrowLeft':
      return (currentIndex - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
