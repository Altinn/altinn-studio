import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import {
  useLangToolsDataSources,
  useLangToolsRef,
  useSetLangToolsDataSources,
} from 'src/features/language/LangToolsStore';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { useLanguageWithForcedNode } from 'src/features/language/useLanguage';
import { getLanguageFromCode } from 'src/language/languages';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { TextResourceVariablesDataSources } from 'src/features/language/useLanguage';
import type { ILanguage } from 'src/types/shared';

export interface LangDataSources extends Omit<TextResourceVariablesDataSources, 'node'> {
  textResources: TextResourceMap;
  selectedLanguage: string;
  language: ILanguage;
}

const emptyObject = {};

export const LangDataSourcesProvider = ({ children }: PropsWithChildren) => {
  const textResources = useTextResources();
  const selectedAppLanguage = useCurrentLanguage();
  const dataModels = useDataModelReaders();
  const _applicationSettings = useLaxApplicationSettings();
  const applicationSettings = _applicationSettings === ContextNotProvided ? emptyObject : _applicationSettings;
  const instance = useLaxInstanceData();
  const instanceDataSources = useMemo(() => buildInstanceDataSources(instance), [instance]);

  const setDataSources = useSetLangToolsDataSources();
  useEffect(() => {
    const ctx: LangDataSources = {
      textResources,
      language: getLanguageFromCode(selectedAppLanguage),
      selectedLanguage: selectedAppLanguage,
      dataModels,
      applicationSettings,
      instanceDataSources,
    };

    setDataSources(ctx);
  }, [textResources, selectedAppLanguage, dataModels, applicationSettings, instanceDataSources, setDataSources]);

  const current = useLangToolsDataSources();
  if (!current) {
    // We cannot render <Loader /> here, as that would lead to an infinite loop
    return null;
  }

  return <>{children}</>;
};

export function ProvideUseLanguageRef() {
  const intoRef = useLangToolsRef();
  intoRef.current = useLanguageWithForcedNode(undefined);
  return null;
}
