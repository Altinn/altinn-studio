import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactElement, Ref } from 'react';
import cn from 'classnames';
import { ChevronDownIcon, ChevronRightIcon } from '@studio/icons';
import classes from './StudioCodeViewer.module.css';
import { MAX_HIGHLIGHT_LENGTH } from './codeLanguage';
import type { highlightCode, StudioCodeViewerLanguage } from './highlightCode';
import { findJsonFoldRegions, splitHighlightedCodeIntoLines } from './codeLines';
import type { FoldRegion } from './codeLines';

export type StudioCodeViewerTexts = {
  collapse: string;
  expand: string;
};

export type StudioCodeViewerProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: StudioCodeViewerLanguage;
  title: string;
  texts: StudioCodeViewerTexts;
};

function StudioCodeViewer(
  { code, language, title, texts, className: givenClass, ...rest }: StudioCodeViewerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const codeLines = useMemo(() => createCodeLines(code, language), [code, language]);
  const highlightedLines = useHighlightedLines(codeLines.code, language);
  const [collapsed, setCollapsed] = useState<CollapsedLines>({ codeLines, indexes: new Set() });
  const collapsedIndexes = collapsed.codeLines === codeLines ? collapsed.indexes : noIndexes;
  const [focusedFoldIndex, setFocusedFoldIndex] = useState<number>();
  const linesRef = useRef<HTMLDivElement>(null);

  const visibleLineIndexes = findVisibleLineIndexes(codeLines, collapsedIndexes);
  const foldIndexes = visibleLineIndexes.filter((index) => codeLines.foldRegions.has(index));
  // All fold buttons share one Tab stop. The user moves between them with the arrow keys.
  const tabbableFoldIndex = foldIndexes.includes(focusedFoldIndex)
    ? focusedFoldIndex
    : foldIndexes[0];

  const toggleLine = (index: number): void => {
    const indexes = new Set(collapsedIndexes);
    if (!indexes.delete(index)) indexes.add(index);
    setCollapsed({ codeLines, indexes });
  };

  const moveFoldFocus = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const foldButtons = Array.from(linesRef.current.querySelectorAll('button'));
    const targetButton = findFoldButtonForKey(foldButtons, event.currentTarget, event.key);
    if (!targetButton) return;
    event.preventDefault();
    targetButton.focus();
  };

  const lineNumberWidth = { '--line-number-width': `${codeLines.lines.length}`.length + 'ch' };

  return (
    <div className={cn(classes.codeViewer, givenClass)} {...rest} ref={ref}>
      <div className={classes.header}>
        <span className={classes.title}>{title}</span>
      </div>
      <div className={classes.scrollArea} tabIndex={0} role='region' aria-label={title}>
        <div ref={linesRef} className={classes.lines} style={lineNumberWidth as CSSProperties}>
          {visibleLineIndexes.map((index) => (
            <CodeLine
              key={index}
              index={index}
              codeLines={codeLines}
              highlightedLine={highlightedLines?.[index]}
              isCollapsed={collapsedIndexes.has(index)}
              isTabbable={index === tabbableFoldIndex}
              onToggle={() => toggleLine(index)}
              onFoldFocus={() => setFocusedFoldIndex(index)}
              onFoldKeyDown={moveFoldFocus}
              texts={texts}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CodeLines = {
  code: string;
  lines: string[];
  foldRegions: Map<number, FoldRegion>;
};

type CollapsedLines = {
  codeLines: CodeLines;
  indexes: ReadonlySet<number>;
};

const noIndexes: ReadonlySet<number> = new Set();

function createCodeLines(code: string, language?: StudioCodeViewerLanguage): CodeLines {
  const normalizedCode = code.replace(/\r\n?/g, '\n');
  return {
    code: normalizedCode,
    lines: normalizedCode.split('\n'),
    foldRegions: language === 'json' ? findJsonFoldRegions(normalizedCode) : new Map(),
  };
}

let loadedHighlightCode: typeof highlightCode | undefined;

export async function loadHighlightCode(): Promise<typeof highlightCode> {
  loadedHighlightCode ??= (await import('./highlightCode')).highlightCode;
  return loadedHighlightCode;
}

function useHighlightedLines(
  code: string,
  language?: StudioCodeViewerLanguage,
): string[] | undefined {
  const [highlight, setHighlight] = useState(() => loadedHighlightCode);
  const canHighlight = Boolean(language) && code.length <= MAX_HIGHLIGHT_LENGTH;

  useEffect(() => {
    if (!canHighlight || highlight) return;
    loadHighlightCode().then((loaded) => setHighlight(() => loaded));
  }, [canHighlight, highlight]);

  return useMemo(
    () =>
      canHighlight && highlight
        ? splitHighlightedCodeIntoLines(highlight(code, language))
        : undefined,
    [canHighlight, highlight, code, language],
  );
}

function findVisibleLineIndexes(
  { lines, foldRegions }: CodeLines,
  collapsedIndexes: ReadonlySet<number>,
): number[] {
  const visibleIndexes: number[] = [];
  let index = 0;
  while (index < lines.length) {
    visibleIndexes.push(index);
    index = collapsedIndexes.has(index) ? foldRegions.get(index).endIndex + 1 : index + 1;
  }
  return visibleIndexes;
}

function findFoldButtonForKey(
  foldButtons: HTMLButtonElement[],
  currentButton: HTMLButtonElement,
  key: string,
): HTMLButtonElement | undefined {
  const position = foldButtons.indexOf(currentButton);
  switch (key) {
    case 'ArrowDown':
      return foldButtons[position + 1];
    case 'ArrowUp':
      return foldButtons[position - 1];
    case 'Home':
      return foldButtons[0];
    case 'End':
      return foldButtons.at(-1);
    default:
      return undefined;
  }
}

type CodeLineProps = {
  index: number;
  codeLines: CodeLines;
  highlightedLine?: string;
  isCollapsed: boolean;
  isTabbable: boolean;
  onToggle: () => void;
  onFoldFocus: () => void;
  onFoldKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  texts: StudioCodeViewerTexts;
};

function CodeLine({
  index,
  codeLines,
  highlightedLine,
  isCollapsed,
  isTabbable,
  onToggle,
  onFoldFocus,
  onFoldKeyDown,
  texts,
}: CodeLineProps): ReactElement {
  const line = codeLines.lines[index];
  const foldRegion = codeLines.foldRegions.get(index);
  const FoldIcon = isCollapsed ? ChevronRightIcon : ChevronDownIcon;

  return (
    <div className={classes.line}>
      <span className={classes.gutter}>
        <span className={classes.lineNumber} aria-hidden>
          {index + 1}
        </span>
        {foldRegion === undefined ? (
          <span className={classes.foldButtonSpace} />
        ) : (
          <button
            type='button'
            className={classes.foldButton}
            tabIndex={isTabbable ? 0 : -1}
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? texts.expand : texts.collapse} ${line.trim()}`}
            onClick={onToggle}
            onFocus={onFoldFocus}
            onKeyDown={onFoldKeyDown}
          >
            <FoldIcon aria-hidden />
          </button>
        )}
      </span>
      <code className={classes.code}>
        {highlightedLine === undefined ? (
          line
        ) : (
          // The highlighter escapes the code, so the result contains only its own span elements.
          <span dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        )}
        {isCollapsed && (
          <>
            <span className={classes.collapsedContent}>…</span>
            {codeLines.lines[foldRegion.endIndex].slice(foldRegion.closingColumn)}
          </>
        )}
      </code>
    </div>
  );
}

const ForwardedStudioCodeViewer = forwardRef(StudioCodeViewer);

export { ForwardedStudioCodeViewer as StudioCodeViewer };
