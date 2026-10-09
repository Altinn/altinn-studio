import { forwardRef, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactElement, Ref } from 'react';
import cn from 'classnames';
import { ChevronDownIcon, ChevronRightIcon } from '@studio/icons';
import classes from './StudioCodeViewer.module.css';
import type { StudioCodeViewerLanguage } from './registerHighlighter';
import { useHighlightedLines } from './useHighlightedLines';
import {
  createCodeLines,
  findFoldButtonForKey,
  findVisibleLineIndexes,
  MAX_FORMATTED_CODE_LENGTH,
} from './utils';
import type { CodeLines } from './utils';

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
  const isPlainText = code.length > MAX_FORMATTED_CODE_LENGTH;
  const formattedLanguage = isPlainText ? undefined : language;
  const codeLines = useMemo(
    () => createCodeLines(code, formattedLanguage),
    [code, formattedLanguage],
  );
  const highlightedLines = useHighlightedLines(codeLines.code, formattedLanguage);
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
          {isPlainText ? (
            <PlainCode codeLines={codeLines} />
          ) : (
            visibleLineIndexes.map((index) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type CollapsedLines = {
  codeLines: CodeLines;
  indexes: ReadonlySet<number>;
};

const noIndexes: ReadonlySet<number> = new Set();

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

function PlainCode({ codeLines }: { codeLines: CodeLines }): ReactElement {
  const lineNumbers = codeLines.lines.map((_, index) => index + 1).join('\n');
  return (
    <div className={classes.line}>
      <span className={classes.gutter}>
        <span className={classes.lineNumber} aria-hidden>
          {lineNumbers}
        </span>
      </span>
      <code className={classes.code}>{codeLines.code}</code>
    </div>
  );
}

const ForwardedStudioCodeViewer = forwardRef(StudioCodeViewer);

export { ForwardedStudioCodeViewer as StudioCodeViewer };
