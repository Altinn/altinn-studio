import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, KeyboardEvent, ReactElement } from 'react';
import { parseDomToBlocks, parseMarkdown, renderBlocksToDom, serializeMarkdown } from '../markdown';
import { FormattingToolbar } from '../FormattingToolbar';
import { LinkForm } from '../LinkForm';
import type { FormattingCommand, FormattingState } from '../types/FormattingCommand';
import type { StudioMarkdownEditorTexts } from '../types/StudioMarkdownEditorTexts';
import {
  applyFormattingCommand,
  applyLink,
  findLinkHref,
  focusEditor,
  getEditorRange,
  getFormattingState,
  inactiveFormattingState,
  insertPlainText,
  isInlineFormattingCommand,
  prepareEditor,
  removeLink,
  restoreRange,
} from './editorCommands';
import { EditorHistory } from './EditorHistory';
import classes from './PreviewEditor.module.css';

export type PreviewEditorProps = {
  editorId: string;
  labelId: string;
  onChange: (markdown: string) => void;
  texts: StudioMarkdownEditorTexts;
  value: string;
};

type LinkFormState = { initialUrl: string } | null;
type HistoryAction = 'undo' | 'redo';

export function PreviewEditor({
  editorId,
  labelId,
  onChange,
  texts,
  value,
}: PreviewEditorProps): ReactElement {
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedMarkdownRef = useRef<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [formattingState, setFormattingState] = useState<FormattingState>(inactiveFormattingState);
  const [linkForm, setLinkForm] = useState<LinkFormState>(null);
  const historyRef = useRef<EditorHistory | null>(null);

  const getHistory = useCallback((): EditorHistory => {
    historyRef.current ??= new EditorHistory(editorRef.current);
    return historyRef.current;
  }, []);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (value === renderedMarkdownRef.current) return;
    editor.replaceChildren(renderBlocksToDom(parseMarkdown(value), editor.ownerDocument));
    renderedMarkdownRef.current = value;
    getHistory().clear();
  }, [value, getHistory]);

  const updateSelectionState = useCallback((): void => {
    const editor = editorRef.current;
    const range = getEditorRange(editor);
    if (range) savedRangeRef.current = range.cloneRange();
    setFormattingState(getFormattingState(editor, range));
  }, []);

  useEffect(() => {
    const document = editorRef.current.ownerDocument;
    document.addEventListener('selectionchange', updateSelectionState);
    return (): void => document.removeEventListener('selectionchange', updateSelectionState);
  }, [updateSelectionState]);

  const emitChange = useCallback((): void => {
    const markdown = serializeMarkdown(parseDomToBlocks(editorRef.current));
    if (markdown === renderedMarkdownRef.current) return;
    renderedMarkdownRef.current = markdown;
    onChange(markdown);
  }, [onChange]);

  const runHistoryAction = useCallback(
    (action: HistoryAction): void => {
      const history = getHistory();
      const hasChanged = action === 'undo' ? history.undo() : history.redo();
      if (hasChanged) emitChange();
    },
    [emitChange, getHistory],
  );

  useEffect(() => {
    const editor = editorRef.current;
    const handleBeforeInput = (event: InputEvent): void => {
      const historyAction = historyActionForInputType(event.inputType);
      if (historyAction) {
        event.preventDefault();
        runHistoryAction(historyAction);
      } else {
        getHistory().record(mergeKeyForInputType(event.inputType));
      }
    };
    editor.addEventListener('beforeinput', handleBeforeInput);
    return (): void => editor.removeEventListener('beforeinput', handleBeforeInput);
  }, [getHistory, runHistoryAction]);

  const openLinkForm = (): void => {
    const editor = editorRef.current;
    const range = getEditorRange(editor) ?? savedRangeRef.current;
    savedRangeRef.current = range?.cloneRange() ?? null;
    setLinkForm({ initialUrl: findLinkHref(editor, range) });
  };

  const closeLinkForm = (): void => {
    setLinkForm(null);
    restoreRange(editorRef.current, savedRangeRef.current);
  };

  const handleLinkChange = (update: (editor: HTMLElement, range: Range | null) => void): void => {
    setLinkForm(null);
    restoreRange(editorRef.current, savedRangeRef.current);
    getHistory().record();
    update(editorRef.current, savedRangeRef.current);
    emitChange();
    updateSelectionState();
  };

  const handleCommand = (command: FormattingCommand): void => {
    if (command === 'link') return openLinkForm();
    const editor = editorRef.current;
    focusEditor(editor, savedRangeRef.current);
    getHistory().record();
    applyFormattingCommand(editor, command, getFormattingState(editor, getEditorRange(editor)));
    emitChange();
    updateSelectionState();
  };

  const isCommandDisabled = (command: FormattingCommand): boolean =>
    formattingState.codeBlock && isInlineFormattingCommand(command);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const historyAction = historyActionForShortcut(key, event.shiftKey);
    if (historyAction) {
      event.preventDefault();
      runHistoryAction(historyAction);
    } else if (key === 'u') {
      event.preventDefault();
    } else if (key === 'k') {
      event.preventDefault();
      openLinkForm();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>): void => {
    event.preventDefault();
    getHistory().record();
    insertPlainText(editorRef.current, event.clipboardData.getData('text/plain'));
    emitChange();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const document = editorRef.current.ownerDocument;
    const dropRange = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (dropRange) restoreRange(editorRef.current, dropRange);
    getHistory().record();
    insertPlainText(editorRef.current, event.dataTransfer.getData('text/plain'));
    emitChange();
  };

  return (
    <div className={classes.previewEditor}>
      <FormattingToolbar
        editorId={editorId}
        formattingState={formattingState}
        isCommandDisabled={isCommandDisabled}
        onCommand={handleCommand}
        texts={texts}
      />
      {linkForm && (
        <LinkForm
          initialUrl={linkForm.initialUrl}
          onApply={(url) => handleLinkChange((editor, range) => applyLink(editor, range, url))}
          onCancel={closeLinkForm}
          onRemove={() => handleLinkChange(removeLink)}
          texts={texts}
        />
      )}
      <div
        aria-labelledby={labelId}
        aria-multiline
        className={classes.content}
        contentEditable
        id={editorId}
        onDrop={handleDrop}
        onFocus={() => prepareEditor(editorRef.current)}
        onInput={emitChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={editorRef}
        role='textbox'
        suppressContentEditableWarning
        tabIndex={0}
      />
    </div>
  );
}

function historyActionForInputType(inputType: string): HistoryAction | null {
  switch (inputType) {
    case 'historyUndo':
      return 'undo';
    case 'historyRedo':
      return 'redo';
    default:
      return null;
  }
}

function historyActionForShortcut(key: string, shiftKey: boolean): HistoryAction | null {
  if (key === 'z') return shiftKey ? 'redo' : 'undo';
  if (key === 'y') return 'redo';
  return null;
}

function mergeKeyForInputType(inputType: string): string | null {
  if (inputType.startsWith('insert') && inputType.endsWith('Text')) return 'insertText';
  if (inputType.startsWith('delete')) return 'delete';
  return null;
}
