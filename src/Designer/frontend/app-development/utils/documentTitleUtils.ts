const DEFAULT_DOCUMENT_TITLE = 'Altinn Studio';
const TITLE_SEPARATOR = ' – ';

export function buildDocumentTitle(title?: string): string {
  return [title, DEFAULT_DOCUMENT_TITLE].filter(Boolean).join(TITLE_SEPARATOR);
}
