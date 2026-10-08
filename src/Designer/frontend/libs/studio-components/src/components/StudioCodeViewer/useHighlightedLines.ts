import { useEffect, useMemo, useState } from 'react';
import type { StudioCodeViewerLanguage } from './highlighter';
import { getHighlighterIfLoaded, highlightCodeLines, loadHighlighter } from './highlightUtils';

export function useHighlightedLines(
  code: string,
  language?: StudioCodeViewerLanguage,
): string[] | undefined {
  const [highlighter, setHighlighter] = useState(getHighlighterIfLoaded);

  useEffect(() => {
    if (!language || highlighter) return;
    loadHighlighter().then(setHighlighter);
  }, [language, highlighter]);

  return useMemo(
    () => (language && highlighter ? highlightCodeLines(highlighter, code, language) : undefined),
    [highlighter, code, language],
  );
}
