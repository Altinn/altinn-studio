import DOMPurify from 'dompurify';
import parseHtmlToReact, { HTMLReactParserOptions } from 'html-react-parser';
import { marked } from 'marked';

import type { ITextResource, IDataSources, ILanguage, IApplication, IAltinnOrgs } from '../types';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
});

export function getLanguageFromKey(key: string, language: ILanguage) {
  if (!key) {
    return key;
  }
  const name = getNestedObject(language, key.split('.'));
  if (!name) {
    return key;
  }
  return name;
}

export function getNestedObject(nestedObj: any, pathArr: string[]) {
  return pathArr.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), nestedObj);
}

// Example: {getParsedLanguageFromKey('marked.markdown', language, ['hei', 'sann'])}
export const getParsedLanguageFromKey = (key: string, language: ILanguage, params?: any[], stringOutput?: boolean) => {
  const name = getLanguageFromKey(key, language);
  const paramParsed = params ? replaceParameters(name, params) : name;

  if (stringOutput) {
    return paramParsed;
  }
  return getParsedLanguageFromText(paramParsed);
};

export const getParsedLanguageFromText = (text: string, allowedTags?: string[], allowedAttr?: string[]) => {
  const dirty = marked.parse(text);
  const options: DOMPurify.Config = {};
  if (allowedTags) {
    options.ALLOWED_TAGS = allowedTags;
  }

  if (allowedAttr) {
    options.ALLOWED_ATTR = allowedAttr;
  }

  const clean = DOMPurify.sanitize(dirty, options);
  return parseHtmlToReact(clean.toString().trim(), parseOptions);
};


export const parseOptions: HTMLReactParserOptions = {
  replace: (domNode) => {
    replaceRootTag(domNode);
  },
};

const replaceRootTag = (domNode: any) => {
  if (!domNode.parent && domNode.type === 'tag' && domNode.name === 'p') {
    // The root element from the `marked.parse` will in many cases result in a `p` tag, which is not what we want,
    // since the text might already be used in f.ex `p`, `button`, `label` tags etc.
    // Span is a better solution, although not perfect, as block level elements are not valid children (f.ex h1), but this should be less frequent.
    domNode.name = 'span';
  }
};

const replaceParameters = (nameString: string, params: string[]) => {
  let mutatingString = nameString;
  params.forEach((param: string, index: number) => {
    mutatingString = mutatingString.replaceAll(`{${index}}`, param);
  });
  return mutatingString;
};

export function getTextResourceByKey(key: string, textResources: ITextResource[]) {
  if (!textResources) {
    return key;
  }
  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  return textResource ? textResource.value : key;
}

export function replaceTextResourceParams(
  textResources: ITextResource[],
  dataSources: IDataSources,
  repeatingGroups?: any,
): ITextResource[] {
  let replaceValues: string[];
  const resourcesWithVariables = textResources?.filter((resource) => resource.variables);
  resourcesWithVariables?.forEach((resource) => {
    const variableForRepeatingGroup = resource.variables.find((variable) => variable.key.indexOf('[{0}]') > -1);
    if (repeatingGroups && variableForRepeatingGroup) {
      const repeatingGroupId = Object.keys(repeatingGroups).find((groupId) => {
        const id = variableForRepeatingGroup.key.split('[{0}]')[0];
        return repeatingGroups[groupId].dataModelBinding === id;
      });
      const repeatingGroupIndex = repeatingGroups[repeatingGroupId]?.index;

      for (let i = 0; i <= repeatingGroupIndex; ++i) {
        replaceValues = [];
        resource.variables.forEach((variable) => {
          if (variable.dataSource.startsWith('dataModel')) {
            if (variable.key.indexOf('[{0}]') > -1) {
              const keyWithIndex = variable.key.replace('{0}', `${i}`);
              replaceValues.push(dataSources.dataModel[keyWithIndex] || '');
            } else {
              replaceValues.push(dataSources.dataModel[variable.key] || '');
            }
          }
        });
        const newValue = replaceParameters(resource.unparsedValue, replaceValues);

        if (resource.repeating && resource.id.endsWith(`-${i}`)) {
          resource.value = newValue;
        } else if (!resource.repeating && textResources.findIndex((r) => r.id === `${resource.id}-${i}`) === -1) {
          const newId = `${resource.id}-${i}`;
          textResources.push({
            ...resource,
            id: newId,
            value: newValue,
            repeating: true,
          });
        }
      }
    } else {
      replaceValues = [];
      resource.variables.forEach((variable) => {
        if (variable.dataSource.startsWith('dataModel')) {
          replaceValues.push(dataSources.dataModel[variable.key] || variable.key);
        }
        else if (variable.dataSource === 'applicationSettings') {
          replaceValues.push(dataSources.applicationSettings[variable.key] || variable.key);
        }
        else if (variable.dataSource === 'instanceContext') {
          replaceValues.push(dataSources.instanceContext[variable.key] || variable.key);
        }
      });

      const newValue = replaceParameters(resource.unparsedValue, replaceValues);
      if (resource.value !== newValue) {
        resource.value = newValue;
      }
    }
  });
  return textResources;
}

export function getAppOwner(
  textResources: ITextResource[],
  orgs: IAltinnOrgs,
  org: string,
  userLanguage: string,
  ) {

  const appOwner = getTextResourceByKey('appOwner', textResources);
  if (appOwner !== 'appOwner') {
    return appOwner;
  }

  // if no text resource key is set, fetch from orgs
  if (orgs && orgs[org]) {
    return orgs[org].name[userLanguage] || orgs[org].name.nb;
  }

  return undefined;
}

const appNameKey = 'appName';
const oldAppNameKey = 'ServiceName';

export function getAppName(
  textResources: ITextResource[],
  applicationMetadata: IApplication,
  userLanguage: string
  ) {
    let appName = getTextResourceByKey(appNameKey, textResources);
    if (appName === appNameKey) {
      appName = getTextResourceByKey(oldAppNameKey, textResources);
    }

    if (appName !== appNameKey && appName !== oldAppNameKey) {
      return appName;
    }

    // if no text resource key is set, fetch from app metadata
    if (applicationMetadata) {
        return applicationMetadata.title[userLanguage] || applicationMetadata.title.nb;
    }

    return undefined;
}
