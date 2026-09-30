import { forwardRef, useMemo } from 'react';
import type { HTMLAttributes, ReactElement, Ref } from 'react';
import cn from 'classnames';
import classes from './StudioCodeViewer.module.css';
import { highlightCode, MAX_HIGHLIGHT_LENGTH } from './codeLanguage';
import type { StudioCodeViewerLanguage } from './codeLanguage';

export type StudioCodeViewerProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: StudioCodeViewerLanguage;
  title?: string;
};

function StudioCodeViewer(
  { code, language, title, className: givenClass, ...rest }: StudioCodeViewerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const normalizedCode = useMemo(() => normalizeLineBreaks(code), [code]);
  const lineNumbers = useMemo(() => createLineNumbers(normalizedCode), [normalizedCode]);

  return (
    <div className={cn(classes.codeViewer, givenClass)} {...rest} ref={ref}>
      {title && <div className={classes.header}>{title}</div>}
      <div
        className={classes.scrollArea}
        tabIndex={0}
        role={title ? 'region' : undefined}
        aria-label={title}
      >
        <pre className={classes.lineNumbers} aria-hidden>
          {lineNumbers}
        </pre>
        <pre className={classes.code}>
          <Code code={normalizedCode} language={language} />
        </pre>
      </div>
    </div>
  );
}

type CodeProps = {
  code: string;
  language?: StudioCodeViewerLanguage;
};

function Code({ code, language }: CodeProps): ReactElement {
  const highlightedCode = useMemo(
    () => (canHighlight(code, language) ? highlightCode(code, language) : null),
    [code, language],
  );

  if (highlightedCode === null) {
    return <code>{code}</code>;
  }

  // The highlighter escapes the code, so the result contains only its own span elements.
  return <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
}

function canHighlight(code: string, language?: StudioCodeViewerLanguage): boolean {
  return Boolean(language) && code.length <= MAX_HIGHLIGHT_LENGTH;
}

function normalizeLineBreaks(code: string): string {
  return code.replace(/\r\n?/g, '\n');
}

function createLineNumbers(code: string): string {
  const lines = code.replace(/\n$/, '').split('\n');
  return lines.map((_, index) => index + 1).join('\n');
}

const ForwardedStudioCodeViewer = forwardRef(StudioCodeViewer);

export { ForwardedStudioCodeViewer as StudioCodeViewer };
