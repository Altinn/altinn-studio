import { useLanguage } from 'src/features/language/useLanguage';
import type { ValidLangParam, ValidLanguageKey } from 'src/features/language/useLanguage';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface LangProps {
  id: ValidLanguageKey | string | undefined;
  params?: ValidLangParam[];
  node?: LayoutNode;
  parseHtmlAndMarkdown?: boolean;
}

export function Lang({ id, params, node, parseHtmlAndMarkdown }: LangProps) {
  const { lang, langAsNonProcessedString } = useLanguage(node);

  if (parseHtmlAndMarkdown === false) {
    return langAsNonProcessedString(id, params);
  }

  return lang(id, params);
}
