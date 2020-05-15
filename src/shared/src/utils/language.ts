import * as DOMPurify from 'dompurify';
import ReactHtmlParser from 'react-html-parser';
import { ITextResource, IDataSources } from '../types';

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

export const getParsedLanguageFromText = (text: string, allowedTags?: string[], allowedAttr?: string[]) => {
  const dirty = marked(text);
  const options: DOMPurify.Config = {};
  if (allowedTags) {
    options.ALLOWED_TAGS = allowedTags;
  }

  if (allowedAttr) {
    options.ALLOWED_ATTR = allowedAttr;
  }
  const clean =  DOMPurify.sanitize(dirty, options);
  return ReactHtmlParser(clean.toString());
}

const replaceParameters = (nameString: any, params: any[]) => {
  let index = 0;
  for (const param of params) {
    nameString = nameString.replace(`{${index}}`, param);
    index += 1;
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

export function replaceTextResourceParams(textResources: ITextResource[], dataSources: IDataSources): void {
  var replaceValues: string[];

  textResources.forEach((resource) => {
    if (resource.variables){
      replaceValues = [];
      resource.variables.forEach((variable) => {
        if (variable.dataSource.startsWith('dataModel')){
          replaceValues.push(dataSources['dataModel'][variable.key] ? dataSources['dataModel'][variable.key] : variable.key);
        }
      });

      const newValue = replaceParameters(resource.unparsedValue, replaceValues);
      if (resource.value != newValue){
        resource.value = newValue;
      }
    }
  });
}
