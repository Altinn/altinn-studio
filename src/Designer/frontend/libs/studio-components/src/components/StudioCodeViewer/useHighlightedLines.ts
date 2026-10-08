import { useEffect, useMemo, useState } from 'react';
import type { StudioCodeViewerLanguage } from './highlightCode';
import { splitHighlightedCodeIntoLines } from './codeLines';
import { getHighlightCodeIfLoaded, loadHighlightCode } from './utils';

export function useHighlightedLines(
  code: string,
  language?: StudioCodeViewerLanguage,
): string[] | undefined {
  const [highlight, setHighlight] = useState(getHighlightCodeIfLoaded);

  useEffect(() => {
    if (!language || highlight) return;
    loadHighlightCode().then((loaded) => setHighlight(() => loaded));
  }, [language, highlight]);

  return useMemo(
    () =>
      language && highlight ? splitHighlightedCodeIntoLines(highlight(code, language)) : undefined,
    [highlight, code, language],
  );
}
