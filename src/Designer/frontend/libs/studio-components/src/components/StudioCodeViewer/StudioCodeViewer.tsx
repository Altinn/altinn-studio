import { forwardRef, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactElement, Ref } from 'react';
import cn from 'classnames';
import { ChevronDownIcon, ChevronRightIcon } from '@studio/icons';
import classes from './StudioCodeViewer.module.css';
import { highlightCode, MAX_HIGHLIGHT_LENGTH } from './codeLanguage';
import type { StudioCodeViewerLanguage } from './codeLanguage';
import { findJsonFoldRegions, formatJson, splitHighlightedCodeIntoLines } from './codeLines';

export type StudioCodeViewerTexts = {
  collapse: string;
  expand: string;
};

export type StudioCodeViewerProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  /** JSON is also indented, and its objects and arrays can collapse. */
  language?: StudioCodeViewerLanguage;
  /** Screen readers also use the title as the name of the code. */
  title: string;
  texts: StudioCodeViewerTexts;
};

function StudioCodeViewer(
  { code, language, title, texts, className: givenClass, ...rest }: StudioCodeViewerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const codeLines = useMemo(() => createCodeLines(code, language), [code, language]);
  const [collapsed, setCollapsed] = useState<CollapsedLines>({ codeLines, indexes: new Set() });
  const collapsedIndexes = collapsed.codeLines === codeLines ? collapsed.indexes : noIndexes;
  const [focusedFold, setFocusedFold] = useState<FocusedFold>();
  const foldButtons = useRef(new Map<number, HTMLButtonElement>());

  const visibleLineIndexes = findVisibleLineIndexes(codeLines, collapsedIndexes);
  const foldIndexes = visibleLineIndexes.filter((index) => codeLines.foldRegions.has(index));
  const tabbableFoldIndex = findTabbableFoldIndex(foldIndexes, codeLines, focusedFold);

  const toggleLine = (index: number): void =>
    setCollapsed({ codeLines, indexes: toggleIndex(collapsedIndexes, index) });

  const moveFoldFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const targetIndex = findFoldIndexForKey(foldIndexes, index, event.key);
    if (targetIndex === undefined) return;
    event.preventDefault();
    foldButtons.current.get(targetIndex)?.focus();
  };

  const setFoldButton =
    (index: number) =>
    (element: HTMLButtonElement | null): void => {
      if (element) foldButtons.current.set(index, element);
      else foldButtons.current.delete(index);
    };

  const lineNumberWidth = { '--line-number-width': `${codeLines.lines.length}`.length + 'ch' };

  return (
    <div className={cn(classes.codeViewer, givenClass)} {...rest} ref={ref}>
      <div className={classes.header}>
        <span className={classes.title}>{title}</span>
      </div>
      <div className={classes.scrollArea} tabIndex={0} role='region' aria-label={title}>
        <div className={classes.lines} style={lineNumberWidth as CSSProperties}>
          {visibleLineIndexes.map((index) => (
            <CodeLine
              key={index}
              index={index}
              codeLines={codeLines}
              isCollapsed={collapsedIndexes.has(index)}
              isTabbable={index === tabbableFoldIndex}
              onToggle={() => toggleLine(index)}
              onFoldFocus={() => setFocusedFold({ codeLines, index })}
              onFoldKeyDown={(event) => moveFoldFocus(event, index)}
              foldButtonRef={setFoldButton(index)}
              texts={texts}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CodeLines = {
  lines: string[];
  /** The lines as HTML from the highlighter, or null when the code is not highlighted. */
  highlightedLines: string[] | null;
  foldRegions: Map<number, number>;
};

type CollapsedLines = {
  codeLines: CodeLines;
  indexes: ReadonlySet<number>;
};

type FocusedFold = {
  codeLines: CodeLines;
  index: number;
};

const noIndexes: ReadonlySet<number> = new Set();

function createCodeLines(code: string, language?: StudioCodeViewerLanguage): CodeLines {
  const normalizedCode = normalizeLineBreaks(code).replace(/\n$/, '');
  const formattedJson = language === 'json' ? formatJson(normalizedCode) : null;
  const displayedCode = formattedJson ?? normalizedCode;
  const lines = displayedCode.split('\n');
  return {
    lines,
    highlightedLines: canHighlight(displayedCode, language)
      ? splitHighlightedCodeIntoLines(highlightCode(displayedCode, language))
      : null,
    foldRegions: formattedJson === null ? new Map() : findJsonFoldRegions(lines),
  };
}

function normalizeLineBreaks(code: string): string {
  return code.replace(/\r\n?/g, '\n');
}

function canHighlight(code: string, language?: StudioCodeViewerLanguage): boolean {
  return Boolean(language) && code.length <= MAX_HIGHLIGHT_LENGTH;
}

function toggleIndex(indexes: ReadonlySet<number>, index: number): Set<number> {
  const result = new Set(indexes);
  if (result.has(index)) result.delete(index);
  else result.add(index);
  return result;
}

function findVisibleLineIndexes(
  { lines, foldRegions }: CodeLines,
  collapsedIndexes: ReadonlySet<number>,
): number[] {
  const visibleIndexes: number[] = [];
  let index = 0;
  while (index < lines.length) {
    visibleIndexes.push(index);
    index = collapsedIndexes.has(index) ? foldRegions.get(index) + 1 : index + 1;
  }
  return visibleIndexes;
}

/** All fold buttons share one Tab stop. The user moves between them with the arrow keys. */
function findTabbableFoldIndex(
  foldIndexes: number[],
  codeLines: CodeLines,
  focusedFold?: FocusedFold,
): number | undefined {
  const focusedIndex = focusedFold?.codeLines === codeLines ? focusedFold.index : undefined;
  return focusedIndex !== undefined && foldIndexes.includes(focusedIndex)
    ? focusedIndex
    : foldIndexes[0];
}

function findFoldIndexForKey(
  foldIndexes: number[],
  currentIndex: number,
  key: string,
): number | undefined {
  const position = foldIndexes.indexOf(currentIndex);
  switch (key) {
    case 'ArrowDown':
      return foldIndexes[position + 1];
    case 'ArrowUp':
      return foldIndexes[position - 1];
    case 'Home':
      return foldIndexes[0];
    case 'End':
      return foldIndexes.at(-1);
    default:
      return undefined;
  }
}

type CodeLineProps = {
  index: number;
  codeLines: CodeLines;
  isCollapsed: boolean;
  isTabbable: boolean;
  onToggle: () => void;
  onFoldFocus: () => void;
  onFoldKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  foldButtonRef: Ref<HTMLButtonElement>;
  texts: StudioCodeViewerTexts;
};

function CodeLine({
  index,
  codeLines,
  isCollapsed,
  isTabbable,
  onToggle,
  onFoldFocus,
  onFoldKeyDown,
  foldButtonRef,
  texts,
}: CodeLineProps): ReactElement {
  const codeId = useId();
  const endIndex = codeLines.foldRegions.get(index);
  const isFoldable = endIndex !== undefined;

  return (
    <div className={classes.line}>
      <span className={classes.gutter}>
        <span className={classes.lineNumber} aria-hidden>
          {index + 1}
        </span>
        {isFoldable ? (
          <FoldButton
            codeId={codeId}
            isCollapsed={isCollapsed}
            isTabbable={isTabbable}
            onToggle={onToggle}
            onFocus={onFoldFocus}
            onKeyDown={onFoldKeyDown}
            buttonRef={foldButtonRef}
            texts={texts}
          />
        ) : (
          <span className={classes.foldButtonSpace} />
        )}
      </span>
      <code id={codeId} className={classes.code}>
        <LineContent codeLines={codeLines} index={index} />
        {isCollapsed && (
          <>
            <span className={classes.collapsedContent}>…</span>
            <LineContent codeLines={codeLines} index={endIndex} withoutIndent />
          </>
        )}
      </code>
    </div>
  );
}

type FoldButtonProps = {
  /** The name of the button also contains the code of its line, so that each button has a unique name. */
  codeId: string;
  isCollapsed: boolean;
  isTabbable: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: Ref<HTMLButtonElement>;
  texts: StudioCodeViewerTexts;
};

function FoldButton({
  codeId,
  isCollapsed,
  isTabbable,
  onToggle,
  onFocus,
  onKeyDown,
  buttonRef,
  texts,
}: FoldButtonProps): ReactElement {
  const buttonId = useId();
  const Icon = isCollapsed ? ChevronRightIcon : ChevronDownIcon;
  return (
    <button
      ref={buttonRef}
      id={buttonId}
      type='button'
      className={classes.foldButton}
      tabIndex={isTabbable ? 0 : -1}
      aria-expanded={!isCollapsed}
      aria-label={isCollapsed ? texts.expand : texts.collapse}
      aria-labelledby={`${buttonId} ${codeId}`}
      onClick={onToggle}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <Icon aria-hidden />
    </button>
  );
}

type LineContentProps = {
  codeLines: CodeLines;
  index: number;
  withoutIndent?: boolean;
};

function LineContent({ codeLines, index, withoutIndent }: LineContentProps): ReactElement {
  const removeIndent = (line: string): string => (withoutIndent ? line.trimStart() : line);
  const highlightedLine = codeLines.highlightedLines?.[index];

  if (highlightedLine === undefined) {
    return <>{removeIndent(codeLines.lines[index])}</>;
  }

  // The highlighter escapes the code, so the result contains only its own span elements.
  return <span dangerouslySetInnerHTML={{ __html: removeIndent(highlightedLine) }} />;
}

const ForwardedStudioCodeViewer = forwardRef(StudioCodeViewer);

export { ForwardedStudioCodeViewer as StudioCodeViewer };
