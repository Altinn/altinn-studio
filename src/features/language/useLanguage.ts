import { useContext, useMemo } from 'react';
import type { JSX } from 'react';

import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromCode } from 'src/language/languages';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { FormComponentContext } from 'src/layout';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IFormData } from 'src/features/formData';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { FixedLanguageList } from 'src/language/languages';
import type { IRuntimeState } from 'src/types';
import type { IApplicationSettings, IInstanceDataSources, ILanguage, IVariable } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValidParam = string | number | undefined;

export interface IUseLanguage {
  language: ILanguage;
  lang(key: ValidLanguageKey | string | undefined, params?: ValidParam[]): string | JSX.Element | JSX.Element[] | null;
  langAsString(key: ValidLanguageKey | string | undefined, params?: ValidParam[]): string;
  langAsStringUsingPathInDataModel(
    key: ValidLanguageKey | string | undefined,
    dataModelPath: string,
    params?: ValidParam[],
  ): string;
}

interface TextResourceVariablesDataSources {
  node: LayoutNode | undefined;
  formData: IFormData;
  applicationSettings: IApplicationSettings | null;
  instanceDataSources: IInstanceDataSources | null;
  dataModelPath?: string;
}

/**
 * This type converts the language object into a dot notation union of valid language keys.
 * Using this type helps us get suggestions for valid language keys in useLanguage() functions.
 * Thanks to ChatGPT for refinements to make this work!
 */
type ObjectToDotNotation<T extends Record<string, any>, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends string | number | boolean | null | undefined
      ? `${Prefix}${K}`
      : K extends string
        ? ObjectToDotNotation<T[K], `${Prefix}${K}.`>
        : never
    : never;
}[keyof T];

export type ValidLanguageKey = ObjectToDotNotation<FixedLanguageList>;

/**
 * Hook to resolve a key to a language string or React element (if the key is found and contains markdown or HTML).
 * Prefer this over using the long-named language functions. When those are less used, we can refactor their
 * functionality into this hook and remove them.
 *
 * You get two functions from this hook, and you can choose which one to use based on your needs:
 * - lang(key, params) usually returns a React element
 */
export function useLanguage(node?: LayoutNode) {
  const textResources = useTextResources();
  const selectedAppLanguage = useCurrentLanguage();
  const componentCtx = useContext(FormComponentContext);
  const nearestNode = node || componentCtx?.node;
  const formData = useAppSelector((state) => state.formData.formData);
  const applicationSettings = useAppSelector((state) => state.applicationSettings.applicationSettings);
  const instance = useLaxInstanceData();
  const instanceDataSources = useMemo(() => buildInstanceDataSources(instance), [instance]);

  const dataSources: TextResourceVariablesDataSources = useMemo(
    () => ({
      node: nearestNode,
      formData,
      applicationSettings,
      instanceDataSources,
    }),
    [nearestNode, formData, applicationSettings, instanceDataSources],
  );

  return useMemo(
    () => staticUseLanguage(textResources, null, selectedAppLanguage, dataSources),
    [selectedAppLanguage, textResources, dataSources],
  );
}

/**
 * Static version of useLanguage() for use outside of React components. Can be used from sagas, etc.
 */
export function staticUseLanguageFromState(state: IRuntimeState, node?: LayoutNode) {
  const textResources = state.textResources.resourceMap;
  const selectedAppLanguage = state.deprecated.currentLanguage;
  const formData = state.formData.formData;
  const applicationSettings = state.applicationSettings.applicationSettings;
  const instanceDataSources = buildInstanceDataSources(state.deprecated.lastKnownInstance);
  const dataSources: TextResourceVariablesDataSources = {
    node,
    formData,
    applicationSettings,
    instanceDataSources,
  };

  return staticUseLanguage(textResources, null, selectedAppLanguage, dataSources);
}

interface ILanguageState {
  textResources: TextResourceMap;
  language: ILanguage | null;
  selectedLanguage: string;
  dataSources: TextResourceVariablesDataSources;
}

/**
 * Static version, like the above and below functions, but with an API that lets you pass just the state you need.
 * This is useful for testing, but please do not use this in production code (where all arguments should be passed,
 * even if the signature is updated).
 */
export function staticUseLanguageForTests({
  textResources = {},
  language = null,
  selectedLanguage = 'nb',
  dataSources = {
    instanceDataSources: {
      instanceId: 'instanceId',
      appId: 'org/app',
      instanceOwnerPartyId: '12345',
      instanceOwnerPartyType: 'person',
    },
    formData: {},
    applicationSettings: {},
    node: undefined,
  },
}: Partial<ILanguageState> = {}) {
  return staticUseLanguage(textResources, language, selectedLanguage, dataSources);
}

function staticUseLanguage(
  textResources: TextResourceMap,
  _language: ILanguage | null,
  selectedLanguage: string,
  dataSources: TextResourceVariablesDataSources,
): IUseLanguage {
  const language = _language || getLanguageFromCode(selectedLanguage);

  /**
   * TODO: Clean away any markdown/HTML formatting when using the langAsString function. Even though we support
   * returning a string, we don't want to show markdown/HTML in the UI.
   */

  return {
    language,
    lang: (key, params) => {
      if (!key) {
        return '';
      }

      const textResource = getTextResourceByKey(key, textResources, dataSources);
      if (textResource !== key) {
        return getParsedLanguageFromText(textResource);
      }

      const name = getLanguageFromKey(key, language);
      const paramParsed = params ? replaceParameters(name, params) : name;

      return getParsedLanguageFromText(paramParsed);
    },
    langAsString: (key, params) => {
      if (!key) {
        return '';
      }

      const textResource = getTextResourceByKey(key, textResources, dataSources);
      if (textResource !== key) {
        return textResource;
      }

      const name = getLanguageFromKey(key, language);
      return params ? replaceParameters(name, params) : name;
    },
    langAsStringUsingPathInDataModel(
      key: ValidLanguageKey | string | undefined,
      dataModelPath: string,
      params?: ValidParam[],
    ): string {
      if (!key) {
        return '';
      }

      const textResource = getTextResourceByKey(key, textResources, { ...dataSources, dataModelPath });
      if (textResource !== key) {
        return textResource;
      }

      const name = getLanguageFromKey(key, language);
      const result = params ? replaceParameters(name, params) : name;
      if (result === key) {
        return '';
      }

      return result;
    },
  };
}

function getLanguageFromKey(key: string, language: ILanguage) {
  const path = key.split('.');
  const value = getNestedObject(language, path);
  if (!value || typeof value === 'object') {
    return key;
  }
  return value;
}

function getTextResourceByKey(
  key: string,
  textResources: TextResourceMap,
  dataSources: TextResourceVariablesDataSources,
) {
  const textResource = textResources[key];
  if (!textResource) {
    return key;
  }

  const value = textResource.variables
    ? replaceVariables(textResource.value, textResource.variables, dataSources)
    : textResource.value;

  if (value === key) {
    // Prevents infinite loops when a text resource references itself
    return value;
  }

  // Always look up the text resource value recursively, in case it for example looks up a value in the data model
  // that just points to another text resource (a common pattern in for example the Likert component).
  return getTextResourceByKey(value, textResources, dataSources);
}

function replaceVariables(text: string, variables: IVariable[], dataSources: TextResourceVariablesDataSources) {
  const { node, formData, instanceDataSources, applicationSettings, dataModelPath } = dataSources;
  let out = text;
  for (const idx in variables) {
    const variable = variables[idx];
    let value = variables[idx].key;

    if (variable.dataSource.startsWith('dataModel')) {
      const cleanPath = getKeyWithoutIndexIndicators(value);
      const transposedPath = dataModelPath
        ? transposeDataBinding({ subject: cleanPath, currentLocation: dataModelPath })
        : node?.transposeDataModel(cleanPath) || value;
      if (transposedPath && formData && formData[transposedPath]) {
        value = formData[transposedPath];
      }
    } else if (variable.dataSource === 'instanceContext') {
      value = instanceDataSources && variable.key in instanceDataSources ? instanceDataSources[variable.key] : value;
    } else if (variable.dataSource === 'applicationSettings') {
      value =
        applicationSettings && variable.key in applicationSettings && applicationSettings[variable.key] !== undefined
          ? applicationSettings[variable.key]!
          : value;
    }

    if (value === variable.key) {
      /*
       By returning value if variable.defaultValue is null, we ensure
       that we are returning the dataModel path string instead of blank
       value. If app developers want to return blank value, they should
       set defaultValue to an empty string.
      */
      value = variable.defaultValue ?? value;
    }

    out = out.replaceAll(`{${idx}}`, value);
  }

  return out;
}

function getNestedObject(nestedObj: ILanguage, pathArr: string[]) {
  return pathArr.reduce((obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined), nestedObj);
}

type LangParams = (string | undefined | number)[];
const replaceParameters = (nameString: string | undefined, params: LangParams) => {
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
