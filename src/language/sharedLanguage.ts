import DOMPurify from 'dompurify';
import parseHtmlToReact from 'html-react-parser';
import { marked } from 'marked';
import { mangle } from 'marked-mangle';
import type { HTMLReactParserOptions } from 'html-react-parser';

import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IAltinnOrgs, IApplication, IDataSources, ITextResource } from 'src/types/shared';

marked.use(mangle());

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const url = node.getAttribute('href') || '';
    if (url.startsWith('http') && !url.match(/(local\.altinn|altinn\.no|altinn\.cloud|basefarm\.net)/)) {
      node.classList.add('target-external');
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.classList.add('target-internal');
    }

    if (node.classList.contains('same-window')) {
      node.setAttribute('target', '_self');
    } else {
      node.setAttribute('target', '_blank');
    }
  }
});

export const getParsedLanguageFromText = (
  text: string | undefined,
  purifyOptions?: {
    allowedTags?: string[];
    allowedAttr?: string[];
    disallowedTags?: string[];
  },
  inline = true,
) => {
  const dirty = marked.parse(text || '', { headerIds: false });
  const actualOptions: DOMPurify.Config = {};
  if (purifyOptions?.allowedTags) {
    actualOptions.ALLOWED_TAGS = purifyOptions.allowedTags;
  }

  if (purifyOptions?.allowedAttr) {
    actualOptions.ALLOWED_ATTR = purifyOptions.allowedAttr;
  }

  if (purifyOptions?.disallowedTags) {
    actualOptions.FORBID_TAGS = purifyOptions.disallowedTags;
  }

  const clean = DOMPurify.sanitize(dirty, actualOptions);
  return parseHtmlToReact(clean.toString().trim(), inline ? parseOptions : undefined);
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

export type LangParams = (string | undefined | number)[];
export const replaceParameters = (nameString: string | undefined, params: LangParams) => {
  if (nameString === undefined) {
    return nameString;
  }
  let mutatingString = nameString;
  params.forEach((param, index: number) => {
    if (param !== undefined) {
      mutatingString = mutatingString.replaceAll(`{${index}}`, `${param}`);
    }
  });
  return mutatingString;
};

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

export function getOrgName(
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  langTools: IUseLanguage,
): string | undefined {
  if (orgs && typeof org === 'string' && orgs[org]) {
    return orgs[org].name[langTools.selectedLanguage] || orgs[org].name.nb;
  }

  return undefined;
}

const appOwnerKey = 'appOwner';

export function getAppOwner(orgs: IAltinnOrgs | null, org: string | undefined, langTools: IUseLanguage) {
  const appOwner = langTools.langAsString(appOwnerKey);
  if (appOwner !== appOwnerKey) {
    return appOwner;
  }

  return getOrgName(orgs, org, langTools);
}

const appReceiverKey = 'appReceiver';

export function getAppReceiver(
  orgs: IAltinnOrgs | null,
  org: string | undefined,
  langTools: IUseLanguage,
): string | undefined {
  const appReceiver = langTools.langAsString(appReceiverKey);
  if (appReceiver !== appReceiverKey) {
    return appReceiver;
  }

  return getOrgName(orgs, org, langTools);
}

const appNameKey = 'appName';
const oldAppNameKey = 'ServiceName';

export function getAppName(applicationMetadata: IApplication | null, langTools: IUseLanguage) {
  let appName = langTools.langAsString(appNameKey);
  if (appName === appNameKey) {
    appName = langTools.langAsString(oldAppNameKey);
  }

  if (appName !== appNameKey && appName !== oldAppNameKey) {
    return appName;
  }

  // if no text resource key is set, fetch from app metadata
  if (applicationMetadata) {
    return applicationMetadata.title[langTools.selectedLanguage] || applicationMetadata.title.nb;
  }

  return undefined;
}
