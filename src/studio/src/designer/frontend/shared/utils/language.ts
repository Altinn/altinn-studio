import * as DOMPurify from 'dompurify';
import * as marked from 'marked';
import ReactHtmlParser from 'react-html-parser';

export function getLanguageFromKey(key: string, language: any) {
  if (!key) {
    return key;
  }
  const name = getNestedObject(language, key.split('.'));
  return name || key;
}

export function getNestedObject(nestedObj: any, pathArr: string[]) {
  return pathArr.reduce(
    (obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined),
    nestedObj,
  );
}

export function getUserLanguage() {
  return 'nb';
}

// Example: {getParsedLanguageFromKey('marked.markdown', language, ['hei', 'sann'])}
export const getParsedLanguageFromKey = (key: string, language: any, params?: any[], stringOutput?: boolean) => {
  const name = getLanguageFromKey(key, language);
  const paramParsed = params ? replaceParameters(name, params) : name;

  if (stringOutput) {
    return paramParsed;
  }
  const dirty = marked.parse(paramParsed);
  const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['a', 'b'], ALLOWED_ATTR: ['href', 'target', 'rel'] });
  return ReactHtmlParser(clean);
};

const replaceParameters = (nameString: any, params: any[]) => {
  let index = 0;
  for (const param of params) {
    nameString = nameString.replace(`{${index}}`, param);
    index++;
  }
  return nameString;
};
