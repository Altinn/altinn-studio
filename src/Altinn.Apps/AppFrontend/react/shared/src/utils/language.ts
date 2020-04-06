import * as DOMPurify from 'dompurify';
// import * as marked from 'marked';
import ReactHtmlParser from 'react-html-parser';
import { ITextResource } from '../types';
const marked = require('marked');

export function getLanguageFromKey(key: string, language: any) {
  if (!key) {
    return key;
  }
  const name = getNestedObject(language, key.split('.'));
  if (!name) {
    return key;
  } else {
    return name;
  }
}

export function getNestedObject(nestedObj: any, pathArr: string[]) {
  return pathArr.reduce((obj, key) =>
    (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
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
  } else {
    return getParsedLanguageFromText(paramParsed);
  }
};

export const getParsedLanguageFromText = (text: string, allowedTags?: string[]) => {
  const dirty = marked(text);
  const tags = allowedTags ? allowedTags : ['a', 'b', 'br'];
  const clean =  DOMPurify.sanitize(dirty, {ALLOWED_TAGS: tags, ALLOWED_ATTR: ['href', 'target', 'rel']});
  return ReactHtmlParser(clean);
}

const replaceParameters = (nameString: any, params: any[]) => {
  let index = 1;
  for (const param of params) {
    nameString = nameString.replace(`{${index}}`, param);
    index++;
  }
  return nameString;
};

export function getTextResourceByKey(key: string, textResources: ITextResource[]) {
  if (!textResources) {
    return key;
  }
  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  return textResource ? textResource.value : key;
}
