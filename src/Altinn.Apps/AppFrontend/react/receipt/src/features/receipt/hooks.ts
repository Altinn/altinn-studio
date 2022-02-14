import { useState, useEffect } from 'react';

import type {
  IInstanceContext,
  IDataSources,
  IInstance,
  IProfile,
  ITextResource,
} from 'altinn-shared/types';

import { buildInstanceContext } from 'altinn-shared/utils/instanceContext';
import { getLanguageFromCode } from 'altinn-shared/language';
import { replaceTextResourceParams } from 'altinn-shared/utils/language';

interface IMergeLanguageWithOverrides {
  textResources: ITextResource[];
  instance: IInstance;
  languageCode?: string;
}

const mergeLanguageWithOverrides = ({
  instance,
  textResources,
  languageCode = 'nb',
}: IMergeLanguageWithOverrides) => {
  const originalLanguage = getLanguageFromCode(languageCode);
  const keyPrefix = 'receipt_platform.';
  const instanceContext: IInstanceContext = buildInstanceContext(instance);

  const dataSources: IDataSources = {
    instanceContext,
  };

  const overrides = textResources
    .filter((item) => item.id.startsWith(keyPrefix))
    .map((item) => {
      return {
        ...item,
        unparsedValue: item.value,
      };
    });

  const newTextResources = replaceTextResourceParams(overrides, dataSources);

  const newLanguage = newTextResources.reduce<Record<string, string>>(
    (acc, curr) => {
      const key = curr.id.replace(keyPrefix, '');

      return {
        ...acc,
        [key]: curr.value,
      };
    },
    {},
  );

  return {
    ...originalLanguage.receipt_platform,
    ...newLanguage,
  };
};

interface IUseLanguageWithOverrides {
  textResources?: ITextResource[];
  instance?: IInstance;
  user?: IProfile;
}

export const useLanguageWithOverrides = ({
  textResources,
  instance,
  user,
}: IUseLanguageWithOverrides) => {
  const [language, setLanguage] = useState(null);

  useEffect(() => {
    if (user && !language && textResources && instance) {
      try {
        const mergedLanguage = mergeLanguageWithOverrides({
          languageCode: user.profileSettingPreference?.language,
          textResources,
          instance,
        });

        setLanguage({
          receipt_platform: mergedLanguage,
        });
      } catch (error) {
        console.error(error);
      }
    }
  }, [user, instance, language, textResources]);

  return { language };
};
