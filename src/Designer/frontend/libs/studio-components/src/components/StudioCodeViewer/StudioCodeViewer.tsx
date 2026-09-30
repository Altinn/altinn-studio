import { forwardRef, useMemo, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactElement, Ref } from 'react';
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
  title?: string;
  texts: StudioCodeViewerTexts;
};

function StudioCodeViewer(
  { code, language, title, texts, className: givenClass, ...rest }: StudioCodeViewerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const codeLines = useMemo(() => createCodeLines(code, language), [code, language]);
  const [collapsed, setCollapsed] = useState<CollapsedLines>({ codeLines, indexes: new Set() });
  const collapsedIndexes = collapsed.codeLines === codeLines ? collapsed.indexes : noIndexes;

  const toggleLine = (index: number): void =>
    setCollapsed({ codeLines, indexes: toggleIndex(collapsedIndexes, index) });

  const lineNumberWidth = { '--line-number-width': `${codeLines.lines.length}`.length + 'ch' };

  return (
    <div className={cn(classes.codeViewer, givenClass)} {...rest} ref={ref}>
      {title && (
        <div className={classes.header}>
          <span className={classes.title}>{title}</span>
        </div>
      )}
      <div
        className={classes.scrollArea}
        tabIndex={0}
        role={title ? 'region' : undefined}
        aria-label={title}
      >
        <div className={classes.lines} style={lineNumberWidth as CSSProperties}>
          {findVisibleLineIndexes(codeLines, collapsedIndexes).map((index) => (
            <CodeLine
              key={index}
              index={index}
              codeLines={codeLines}
              isCollapsed={collapsedIndexes.has(index)}
              onToggle={() => toggleLine(index)}
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

type CodeLineProps = {
  index: number;
  codeLines: CodeLines;
  isCollapsed: boolean;
  onToggle: () => void;
  texts: StudioCodeViewerTexts;
};

function CodeLine({ index, codeLines, isCollapsed, onToggle, texts }: CodeLineProps): ReactElement {
  const endIndex = codeLines.foldRegions.get(index);
  const isFoldable = endIndex !== undefined;

  return (
    <div className={classes.line}>
      <span className={classes.gutter}>
        <span className={classes.lineNumber} aria-hidden>
          {index + 1}
        </span>
        {isFoldable ? (
          <FoldButton isCollapsed={isCollapsed} onToggle={onToggle} texts={texts} />
        ) : (
          <span className={classes.foldButtonSpace} />
        )}
      </span>
      <code className={classes.code}>
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
  isCollapsed: boolean;
  onToggle: () => void;
  texts: StudioCodeViewerTexts;
};

function FoldButton({ isCollapsed, onToggle, texts }: FoldButtonProps): ReactElement {
  const label = isCollapsed ? texts.expand : texts.collapse;
  const Icon = isCollapsed ? ChevronRightIcon : ChevronDownIcon;
  return (
    <button
      type='button'
      className={classes.foldButton}
      aria-expanded={!isCollapsed}
      aria-label={label}
      title={label}
      onClick={onToggle}
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
