import { useState, useEffect } from 'react';
import Axios from 'axios';

import type {
  IInstanceContext,
  IDataSources,
  IApplication,
  IInstance,
  IParty,
  IProfile,
  IExtendedInstance,
  ITextResource,
  IAltinnOrgs,
} from 'altinn-shared/types';

import {
  altinnOrganisationsUrl,
  getApplicationMetadataUrl,
  getUserUrl,
  getExtendedInstanceUrl,
  getTextResourceUrl,
} from 'utils/receiptUrlHelper';
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

const cancelSignalMessage = 'canceled';

const logFetchError = (error: any) => {
  if (error?.message !== cancelSignalMessage) {
    console.error(error);
  }
};

export const useFetchInitialData = () => {
  const [party, setParty] = useState<IParty>(null);
  const [instance, setInstance] = useState<IInstance>(null);
  const [organisations, setOrganisations] = useState<IAltinnOrgs>(null);
  const [application, setApplication] = useState<IApplication>(null);
  const [user, setUser] = useState<IProfile>(null);
  const [textResources, setTextResources] = useState<ITextResource[]>(null);

  useEffect(() => {
    const instanceAbortController = new AbortController();
    const orgAbortController = new AbortController();
    const userAbortController = new AbortController();
    const appAbortController = new AbortController();
    const textAbortController = new AbortController();

    const fetchInitialData = async () => {
      try {
        const [instanceResponse, orgResponse, userResponse] = await Promise.all(
          [
            Axios.get<IExtendedInstance>(getExtendedInstanceUrl(), {
              signal: instanceAbortController.signal,
            }),
            Axios.get(altinnOrganisationsUrl, {
              signal: orgAbortController.signal,
            }),
            Axios.get<IProfile>(getUserUrl(), {
              signal: userAbortController.signal,
            }),
          ],
        );

        const app = instanceResponse.data.instance.appId.split('/')[1];
        const [applicationResponse, appTextResourcesResponse] =
          await Promise.all([
            Axios.get<IApplication>(
              getApplicationMetadataUrl(
                instanceResponse.data.instance.org,
                app,
              ),
              {
                signal: appAbortController.signal,
              },
            ),
            Axios.get(
              getTextResourceUrl(
                instanceResponse.data.instance.org,
                app,
                userResponse.data.profileSettingPreference.language,
              ),
              {
                signal: textAbortController.signal,
              },
            ),
          ]);

        setApplication(applicationResponse.data);
        setTextResources(appTextResourcesResponse.data.resources);
        setParty(instanceResponse.data.party);
        setInstance(instanceResponse.data.instance);
        setOrganisations(orgResponse.data.orgs);
        setUser(userResponse.data);
      } catch (error) {
        logFetchError(error);
      }
    };

    fetchInitialData();

    return () => {
      instanceAbortController.abort();
      orgAbortController.abort();
      userAbortController.abort();
    };
  }, []);

  return {
    application,
    textResources,
    party,
    instance,
    organisations,
    user,
  };
};
