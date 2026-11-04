import { act, fireEvent, render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ForwardedRef } from 'react';
import { StudioMarkdownEditor } from './StudioMarkdownEditor';
import type { StudioMarkdownEditorProps } from './StudioMarkdownEditor';
import { texts } from './test-data/texts';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const label = 'Description';
const onChange = jest.fn();
const execCommand = jest.fn();

const defaultProps: StudioMarkdownEditorProps = {
  label,
  onChange,
  texts,
  value: '',
};

/* eslint-disable testing-library/no-node-access -- The editor content must be inspected and selected at node level */
describe('StudioMarkdownEditor', () => {
  beforeEach(() => {
    document.execCommand = execCommand;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete document.execCommand;
  });

  it('Renders the markdown as formatted content in preview mode by default', () => {
    renderStudioMarkdownEditor({ value: '## Heading\n\nSome **bold** text' });
    const editor = getEditor();
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor.querySelector('h2')).toHaveTextContent('Heading');
    expect(editor.querySelector('strong')).toHaveTextContent('bold');
  });

  it('Renders all formatting buttons in the toolbar', () => {
    renderStudioMarkdownEditor();
    const toolbar = screen.getByRole('toolbar', { name: texts.toolbarLabel });
    const buttonNames = [
      texts.bold,
      texts.italic,
      texts.strikethrough,
      texts.inlineCode,
      texts.link,
      texts.heading1,
      texts.heading2,
      texts.heading3,
      texts.bulletList,
      texts.numberedList,
      texts.quote,
      texts.codeBlock,
    ];
    buttonNames.forEach((name) => {
      expect(getToolbarButton(name)).toBeInTheDocument();
      expect(toolbar).toContainElement(getToolbarButton(name));
    });
  });

  it('Calls onChange with the serialized markdown when the content is edited', () => {
    renderStudioMarkdownEditor();
    const editor = getEditor();
    editor.innerHTML = '<h1>Title</h1><p>With <b>bold</b> text</p>';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('# Title\n\nWith **bold** text');
  });

  it('Does not call onChange when an edit does not change the markdown', () => {
    renderStudioMarkdownEditor({ value: 'Text' });
    fireEvent.input(getEditor());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Updates the content when the value changes', () => {
    const { rerender } = renderStudioMarkdownEditor({ value: 'First' });
    rerender(<StudioMarkdownEditor {...defaultProps} value='*Second*' />);
    expect(getEditor().querySelector('em')).toHaveTextContent('Second');
  });

  it('Shows the markdown in a text area in markdown mode', async () => {
    const user = userEvent.setup();
    const value = '**Bold**';
    renderStudioMarkdownEditor({ value });
    await user.click(screen.getByRole('radio', { name: texts.markdownMode }));
    expect(screen.getByRole('textbox', { name: label })).toHaveValue(value);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('Opens in markdown mode when defaultMode is markdown', () => {
    renderStudioMarkdownEditor({ defaultMode: 'markdown', value: 'Text' });
    expect(screen.getByRole('textbox', { name: label })).toHaveValue('Text');
  });

  it('Calls onChange when the markdown is edited in markdown mode', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ defaultMode: 'markdown' });
    await user.type(screen.getByRole('textbox', { name: label }), '# A');
    expect(onChange).toHaveBeenLastCalledWith('# A');
  });

  it('Renders markdown edited in markdown mode when switching back to preview mode', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ defaultMode: 'markdown' });
    await user.type(screen.getByRole('textbox', { name: label }), '- Item');
    await user.click(screen.getByRole('radio', { name: texts.previewMode }));
    expect(getEditor().querySelector('ul li')).toHaveTextContent('Item');
  });

  it.each([
    [texts.bold, 'bold'],
    [texts.italic, 'italic'],
    [texts.strikethrough, 'strikeThrough'],
    [texts.bulletList, 'insertUnorderedList'],
    [texts.numberedList, 'insertOrderedList'],
  ])('Runs the native command when the %s button is clicked', async (buttonName, command) => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Text' });
    selectText(getEditor().querySelector('p').firstChild, 0, 4);
    await user.click(getToolbarButton(buttonName));
    expect(execCommand).toHaveBeenCalledWith(command, false, undefined);
  });

  it.each([
    [texts.heading1, '<h1>'],
    [texts.heading2, '<h2>'],
    [texts.heading3, '<h3>'],
    [texts.codeBlock, '<pre>'],
    [texts.quote, '<blockquote>'],
  ])('Formats the block when the %s button is clicked', async (buttonName, block) => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Text' });
    selectText(getEditor().querySelector('p').firstChild, 0, 0);
    await user.click(getToolbarButton(buttonName));
    expect(execCommand).toHaveBeenCalledWith('formatBlock', false, block);
  });

  it('Turns a heading back into a paragraph when the active heading button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: '## Heading' });
    selectText(getEditor().querySelector('h2').firstChild, 0, 0);
    await user.click(getToolbarButton(texts.heading2));
    expect(execCommand).toHaveBeenCalledWith('formatBlock', false, '<p>');
  });

  it('Marks the buttons for the formatting at the cursor as pressed', () => {
    renderStudioMarkdownEditor({ value: '> **Bold** text' });
    selectText(getEditor().querySelector('strong').firstChild, 1, 1);
    expect(getToolbarButton(texts.bold)).toHaveAttribute('aria-pressed', 'true');
    expect(getToolbarButton(texts.quote)).toHaveAttribute('aria-pressed', 'true');
    expect(getToolbarButton(texts.italic)).toHaveAttribute('aria-pressed', 'false');
  });

  it('Removes the quote when the active quote button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: '> Quoted' });
    selectText(getEditor().querySelector('p').firstChild, 0, 0);
    await user.click(getToolbarButton(texts.quote));
    expect(getEditor().querySelector('blockquote')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith('Quoted');
  });

  it('Wraps the selected text in inline code when the code button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Some code here' });
    selectText(getEditor().querySelector('p').firstChild, 5, 9);
    await user.click(getToolbarButton(texts.inlineCode));
    expect(onChange).toHaveBeenCalledWith('Some `code` here');
  });

  it('Removes inline code when the active code button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Some `code` here' });
    selectText(getEditor().querySelector('code').firstChild, 1, 1);
    await user.click(getToolbarButton(texts.inlineCode));
    expect(onChange).toHaveBeenCalledWith('Some code here');
  });

  it('Disables inline formatting inside a code block', () => {
    renderStudioMarkdownEditor({ value: '```\ncode\n```' });
    selectText(getEditor().querySelector('pre').firstChild, 1, 1);
    expect(getToolbarButton(texts.bold)).toBeDisabled();
    expect(getToolbarButton(texts.link)).toBeDisabled();
    expect(getToolbarButton(texts.codeBlock)).toBeEnabled();
  });

  it('Inserts a link with the address as text when no text is selected', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Visit' });
    selectText(getEditor().querySelector('p').firstChild, 5, 5);
    await user.click(getToolbarButton(texts.link));
    await user.type(screen.getByRole('textbox', { name: texts.linkUrl }), 'altinn.no');
    await user.click(screen.getByRole('button', { name: texts.linkApply }));
    expect(onChange).toHaveBeenCalledWith('Visit[https://altinn.no](https://altinn.no)');
    expect(screen.queryByRole('textbox', { name: texts.linkUrl })).not.toBeInTheDocument();
  });

  it('Creates a link from the selected text', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Visit Altinn' });
    selectText(getEditor().querySelector('p').firstChild, 6, 12);
    await user.click(getToolbarButton(texts.link));
    await user.type(screen.getByRole('textbox', { name: texts.linkUrl }), 'https://altinn.no');
    await user.click(screen.getByRole('button', { name: texts.linkApply }));
    expect(execCommand).toHaveBeenCalledWith('createLink', false, 'https://altinn.no');
  });

  it('Updates the address of an existing link', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: '[Altinn](https://old.no)' });
    selectText(getEditor().querySelector('a').firstChild, 2, 2);
    await user.click(getToolbarButton(texts.link));
    const urlField = screen.getByRole('textbox', { name: texts.linkUrl });
    expect(urlField).toHaveValue('https://old.no');
    await user.clear(urlField);
    await user.type(urlField, 'https://new.no');
    await user.click(screen.getByRole('button', { name: texts.linkApply }));
    expect(onChange).toHaveBeenCalledWith('[Altinn](https://new.no)');
  });

  it('Removes an existing link', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Go to [Altinn](https://altinn.no) now' });
    selectText(getEditor().querySelector('a').firstChild, 2, 2);
    await user.click(getToolbarButton(texts.link));
    await user.click(screen.getByRole('button', { name: texts.linkRemove }));
    expect(onChange).toHaveBeenCalledWith('Go to Altinn now');
  });

  it('Disables the apply button when the link address is unsafe', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Text' });
    selectText(getEditor().querySelector('p').firstChild, 0, 4);
    await user.click(getToolbarButton(texts.link));
    await user.type(screen.getByRole('textbox', { name: texts.linkUrl }), 'javascript:alert(1)');
    expect(screen.getByRole('button', { name: texts.linkApply })).toBeDisabled();
  });

  it('Closes the link form without changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Text' });
    selectText(getEditor().querySelector('p').firstChild, 0, 4);
    await user.click(getToolbarButton(texts.link));
    await user.click(screen.getByRole('button', { name: texts.linkCancel }));
    expect(screen.queryByRole('textbox', { name: texts.linkUrl })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Closes the link form when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Text' });
    selectText(getEditor().querySelector('p').firstChild, 0, 4);
    await user.click(getToolbarButton(texts.link));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: texts.linkUrl })).not.toBeInTheDocument();
  });

  it('Opens the link form with Ctrl+K', () => {
    renderStudioMarkdownEditor({ value: 'Text' });
    fireEvent.keyDown(getEditor(), { key: 'k', ctrlKey: true });
    expect(screen.getByRole('textbox', { name: texts.linkUrl })).toBeInTheDocument();
  });

  it.each([
    ['Ctrl+Z', { key: 'z', ctrlKey: true }],
    ['Cmd+Z', { key: 'z', metaKey: true }],
  ])('Undoes a toolbar change with %s', async (_, undoKey) => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Some code here' });
    selectText(getEditor().querySelector('p').firstChild, 5, 9);
    await user.click(getToolbarButton(texts.inlineCode));
    fireEvent.keyDown(getEditor(), undoKey);
    expect(onChange).toHaveBeenLastCalledWith('Some code here');
    expect(getEditor().querySelector('code')).not.toBeInTheDocument();
  });

  it.each([
    ['Ctrl+Shift+Z', { key: 'z', ctrlKey: true, shiftKey: true }],
    ['Ctrl+Y', { key: 'y', ctrlKey: true }],
  ])('Redoes an undone change with %s', async (_, redoKey) => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Some code here' });
    selectText(getEditor().querySelector('p').firstChild, 5, 9);
    await user.click(getToolbarButton(texts.inlineCode));
    fireEvent.keyDown(getEditor(), { key: 'z', ctrlKey: true });
    fireEvent.keyDown(getEditor(), redoKey);
    expect(onChange).toHaveBeenLastCalledWith('Some `code` here');
  });

  it('Undoes a change when the browser requests an undo', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor({ value: 'Some code here' });
    selectText(getEditor().querySelector('p').firstChild, 5, 9);
    await user.click(getToolbarButton(texts.inlineCode));
    const undoEvent = new InputEvent('beforeinput', { inputType: 'historyUndo', cancelable: true });
    act(() => {
      getEditor().dispatchEvent(undoEvent);
    });
    expect(undoEvent.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith('Some code here');
  });

  it('Pastes clipboard content as plain text', () => {
    renderStudioMarkdownEditor();
    fireEvent.paste(getEditor(), {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'Pasted' : '<b>x</b>') },
    });
    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'Pasted');
  });

  it('Moves focus between toolbar buttons with the arrow keys', async () => {
    const user = userEvent.setup();
    renderStudioMarkdownEditor();
    const boldButton = getToolbarButton(texts.bold);
    expect(boldButton).toHaveAttribute('tabindex', '0');
    act(() => boldButton.focus());
    await user.keyboard('{ArrowRight}');
    expect(getToolbarButton(texts.italic)).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(getToolbarButton(texts.codeBlock)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(boldButton).toHaveFocus();
  });

  it('Forwards the ref to the root element', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioMarkdownEditor({}, ref));
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderStudioMarkdownEditor({ className }));
  });

  it('Accepts custom attributes', () => {
    testCustomAttributes<HTMLDivElement, Partial<StudioMarkdownEditorProps>>(
      renderStudioMarkdownEditor,
    );
  });
});

function getEditor(): HTMLElement {
  return screen.getByRole('textbox', { name: label });
}

function getToolbarButton(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name });
}

function selectText(node: Node, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  act(() => {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

function renderStudioMarkdownEditor(
  props: Partial<StudioMarkdownEditorProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult {
  return render(<StudioMarkdownEditor {...defaultProps} {...props} ref={ref} />);
}
