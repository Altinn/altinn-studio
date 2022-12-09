import DOMPurify from 'dompurify';
import type { HTMLReactParserOptions } from 'html-react-parser';
import parseHtmlToReact from 'html-react-parser';
import { marked } from 'marked';

import type { ITextResource, IDataSources, ILanguage, IApplication, IAltinnOrgs } from 'src/types/shared';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
});

export function getLanguageFromKey(key: string | undefined, language: ILanguage) {
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
  return pathArr.reduce((obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined), nestedObj);
}

// Example: {getParsedLanguageFromKey('marked.markdown', language, ['hei', 'sann'])}
export function getParsedLanguageFromKey(
  key: string,
  language: ILanguage,
  params?: any[],
  stringOutput?: false,
): JSX.Element;
export function getParsedLanguageFromKey(key: string, language: ILanguage, params?: any[], stringOutput?: true): string;
export function getParsedLanguageFromKey(
  key: string,
  language: ILanguage,
  params?: any[],
  stringOutput?: boolean,
): any {
  const name = getLanguageFromKey(key, language);
  const paramParsed = params ? replaceParameters(name, params) : name;

  if (stringOutput) {
    return paramParsed;
  }
  return getParsedLanguageFromText(paramParsed);
}

export const getParsedLanguageFromText = (
  text: string,
  options?: {
    allowedTags?: string[];
    allowedAttr?: string[];
    disallowedTags?: string[];
  },
) => {
  const dirty = marked.parse(text);
  const actualOptions: DOMPurify.Config = {};
  if (options && options.allowedTags) {
    actualOptions.ALLOWED_TAGS = options.allowedTags;
  }

  if (options && options.allowedAttr) {
    actualOptions.ALLOWED_ATTR = options.allowedAttr;
  }

  if (options && options.disallowedTags) {
    actualOptions.FORBID_TAGS = options.disallowedTags;
  }

  const clean = DOMPurify.sanitize(dirty, actualOptions);
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

const replaceParameters = (nameString: string | undefined, params: string[]) => {
  if (nameString === undefined) {
    return nameString;
  }
  let mutatingString = nameString;
  params.forEach((param: string, index: number) => {
    mutatingString = mutatingString.replaceAll(`{${index}}`, param);
  });
  return mutatingString;
};

export function getTextResourceByKey<T extends string | undefined>(
  key: T,
  textResources: ITextResource[] | null,
): string | T {
  if (!textResources || !key) {
    return key;
  }

  const textResource = textResources.find((resource: ITextResource) => resource.id === key);
  if (!textResource) {
    return key;
  }
  // Checks if this text resource is a reference to another text resource.
  // This is a common case when using likert component
  const resource = textResources.find((resource) => resource.id === textResource.value) || textResource;
  return resource.value;
}

/**
 * Replaces all variables in text resources with values from relevant source.
 * @param textResources the original text resources
 * @param dataSources the data sources
 * @param repeatingGroups the repeating groups
 * @returns a new array with replaced values.
 */
export function replaceTextResourceParams(
  textResources: ITextResource[],
  dataSources: IDataSources,
  repeatingGroups?: any,
): ITextResource[] {
  const repeatingGroupResources: ITextResource[] = [];
  const mappedResources = textResources.map((textResource) => {
    const textResourceCopy = { ...textResource };
    if (textResourceCopy.variables) {
      const variableForRepeatingGroup = textResourceCopy.variables.find(
        (variable) => variable.key.indexOf('[{0}]') > -1,
      );
      if (repeatingGroups && variableForRepeatingGroup) {
        const repeatingGroupId = Object.keys(repeatingGroups).find((groupId) => {
          const id = variableForRepeatingGroup.key.split('[{0}]')[0];
          return repeatingGroups[groupId].dataModelBinding === id;
        });
        const repeatingGroupIndex = repeatingGroupId !== undefined && repeatingGroups[repeatingGroupId]?.index;

        for (let i = 0; i <= repeatingGroupIndex; ++i) {
          const replaceValues: string[] = [];
          textResourceCopy.variables.forEach((variable) => {
            if (variable.dataSource.startsWith('dataModel')) {
              if (variable.key.indexOf('[{0}]') > -1) {
                const keyWithIndex = variable.key.replace('{0}', `${i}`);
                replaceValues.push((dataSources.dataModel && dataSources.dataModel[keyWithIndex]) || '');
              } else {
                replaceValues.push((dataSources.dataModel && dataSources.dataModel[variable.key]) || '');
              }
            }
          });
          const newValue = replaceParameters(textResourceCopy.unparsedValue, replaceValues);

          if (!newValue) {
            continue;
          }

          if (textResourceCopy.repeating && textResourceCopy.id.endsWith(`-${i}`)) {
            textResourceCopy.value = newValue;
          } else if (
            !textResourceCopy.repeating &&
            textResources.findIndex((r) => r.id === `${textResourceCopy.id}-${i}`) === -1
          ) {
            const newId = `${textResourceCopy.id}-${i}`;
            repeatingGroupResources.push({
              ...textResourceCopy,
              id: newId,
              value: newValue,
              repeating: true,
            });
          }
        }
      } else {
        const replaceValues: string[] = [];
        textResourceCopy.variables.forEach((variable) => {
          if (variable.dataSource.startsWith('dataModel')) {
            replaceValues.push((dataSources.dataModel && dataSources.dataModel[variable.key]) || variable.key);
          } else if (variable.dataSource === 'applicationSettings') {
            replaceValues.push(
              (dataSources.applicationSettings && dataSources.applicationSettings[variable.key]) || variable.key,
            );
          } else if (variable.dataSource === 'instanceContext') {
            replaceValues.push(
              (dataSources.instanceContext && dataSources.instanceContext[variable.key]) || variable.key,
            );
          }
        });

        const newValue = replaceParameters(textResourceCopy.unparsedValue, replaceValues);
        if (newValue && textResourceCopy.value !== newValue) {
          textResourceCopy.value = newValue;
        }
      }
    }
    return textResourceCopy;
  });

  return mappedResources.concat(repeatingGroupResources);
}

export function getAppOwner(
  textResources: ITextResource[],
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  userLanguage: string,
) {
  const appOwner = getTextResourceByKey('appOwner', textResources);
  if (appOwner !== 'appOwner') {
    return appOwner;
  }

  // if no text resource key is set, fetch from orgs
  if (orgs && typeof org === 'string' && orgs[org]) {
    return orgs[org].name[userLanguage] || orgs[org].name.nb;
  }

  return undefined;
}

const appNameKey = 'appName';
const oldAppNameKey = 'ServiceName';

export function getAppName(
  textResources: ITextResource[],
  applicationMetadata: IApplication | null,
  userLanguage: string,
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
