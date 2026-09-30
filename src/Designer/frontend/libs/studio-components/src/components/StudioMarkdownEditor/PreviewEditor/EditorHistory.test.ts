import { EditorHistory } from './EditorHistory';

describe('EditorHistory', () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement('div');
    editor.innerHTML = '<p>Initial</p>';
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('Restores the recorded content on undo and the changed content on redo', () => {
    const history = new EditorHistory(editor);
    history.record();
    editor.innerHTML = '<p>Changed</p>';
    expect(history.undo()).toBe(true);
    expect(editor.innerHTML).toBe('<p>Initial</p>');
    expect(history.redo()).toBe(true);
    expect(editor.innerHTML).toBe('<p>Changed</p>');
  });

  it('Returns false when there is nothing to undo or redo', () => {
    const history = new EditorHistory(editor);
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
    expect(editor.innerHTML).toBe('<p>Initial</p>');
  });

  it('Restores the selection', () => {
    const history = new EditorHistory(editor);
    selectText(editor.querySelector('p').firstChild, 1, 3);
    history.record();
    editor.innerHTML = '<p>Changed</p>';
    history.undo();
    const selection = document.getSelection();
    expect(selection.toString()).toBe('ni');
    expect(editor.contains(selection.anchorNode)).toBe(true);
  });

  it('Merges changes with the same merge key made in quick succession', () => {
    const history = new EditorHistory(editor);
    history.record('insertText', 1000);
    editor.innerHTML = '<p>Initial a</p>';
    history.record('insertText', 1500);
    editor.innerHTML = '<p>Initial ab</p>';
    history.undo();
    expect(editor.innerHTML).toBe('<p>Initial</p>');
  });

  it('Does not merge changes with the same merge key made far apart in time', () => {
    const history = new EditorHistory(editor);
    history.record('insertText', 1000);
    editor.innerHTML = '<p>Initial a</p>';
    history.record('insertText', 5000);
    editor.innerHTML = '<p>Initial ab</p>';
    history.undo();
    expect(editor.innerHTML).toBe('<p>Initial a</p>');
  });

  it('Clears the redo history when a new change is recorded', () => {
    const history = new EditorHistory(editor);
    history.record();
    editor.innerHTML = '<p>Changed</p>';
    history.undo();
    history.record();
    expect(history.redo()).toBe(false);
  });

  it('Removes all history when cleared', () => {
    const history = new EditorHistory(editor);
    history.record();
    editor.innerHTML = '<p>Changed</p>';
    history.clear();
    expect(history.undo()).toBe(false);
  });
});

function selectText(node: Node, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
