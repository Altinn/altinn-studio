type NodePosition = Readonly<{ path: number[]; offset: number }>;
type SelectionSnapshot = Readonly<{ start: NodePosition; end: NodePosition }>;
type EditorSnapshot = Readonly<{ content: DocumentFragment; selection: SelectionSnapshot | null }>;

const maximumHistoryLength = 100;
const mergeInterval = 1000;

/**
 * Undo and redo history for a content editable element.
 * The browser's native history can not be used because some formatting commands modify the DOM directly,
 * which the native history does not track.
 */
export class EditorHistory {
  private readonly editor: HTMLElement;
  private undoStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];
  private lastMergeKey: string | null = null;
  private lastRecordTime = 0;

  constructor(editor: HTMLElement) {
    this.editor = editor;
  }

  /**
   * Saves the current state before a change.
   * Consecutive changes with the same merge key in quick succession, such as typing, are stored as one step.
   */
  public record(mergeKey: string | null = null, now: number = Date.now()): void {
    const shouldMerge =
      mergeKey !== null &&
      mergeKey === this.lastMergeKey &&
      now - this.lastRecordTime < mergeInterval;
    this.lastMergeKey = mergeKey;
    this.lastRecordTime = now;
    if (shouldMerge) return;
    this.undoStack.push(this.createSnapshot());
    if (this.undoStack.length > maximumHistoryLength) this.undoStack.shift();
    this.redoStack = [];
  }

  public undo(): boolean {
    return this.move(this.undoStack, this.redoStack);
  }

  public redo(): boolean {
    return this.move(this.redoStack, this.undoStack);
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastMergeKey = null;
  }

  private move(from: EditorSnapshot[], to: EditorSnapshot[]): boolean {
    const snapshot = from.pop();
    if (!snapshot) return false;
    to.push(this.createSnapshot());
    this.restoreSnapshot(snapshot);
    this.lastMergeKey = null;
    return true;
  }

  private createSnapshot(): EditorSnapshot {
    const content = this.editor.ownerDocument.createDocumentFragment();
    this.editor.childNodes.forEach((child) => content.appendChild(child.cloneNode(true)));
    return { content, selection: this.createSelectionSnapshot() };
  }

  private createSelectionSnapshot(): SelectionSnapshot | null {
    const selection = this.editor.ownerDocument.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) return null;
    return {
      start: { path: this.pathTo(range.startContainer), offset: range.startOffset },
      end: { path: this.pathTo(range.endContainer), offset: range.endOffset },
    };
  }

  private restoreSnapshot({ content, selection }: EditorSnapshot): void {
    this.editor.replaceChildren(content.cloneNode(true));
    if (!selection) return;
    const range = this.editor.ownerDocument.createRange();
    range.setStart(this.nodeAt(selection.start.path), selection.start.offset);
    range.setEnd(this.nodeAt(selection.end.path), selection.end.offset);
    const documentSelection = this.editor.ownerDocument.getSelection();
    documentSelection?.removeAllRanges();
    documentSelection?.addRange(range);
  }

  private pathTo(node: Node): number[] {
    const path: number[] = [];
    let current: Node = node;
    while (current !== this.editor && current.parentNode) {
      path.unshift(Array.prototype.indexOf.call(current.parentNode.childNodes, current));
      current = current.parentNode;
    }
    return path;
  }

  private nodeAt(path: number[]): Node {
    return path.reduce<Node>((node, index) => node.childNodes[index], this.editor);
  }
}
