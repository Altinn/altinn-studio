import { ILanguage } from "../types";

export const getTranslation = (key: string, language: ILanguage) => {
  if (!key) {
    return key;
  }
  const string = `schema_editor.${key}`;
  return getNestedObject(language, string.split('.')) ?? key;
};

const getNestedObject = (nestedObj: any, pathArr: string[]) => {
  return pathArr.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), nestedObj);
};
