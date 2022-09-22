import { useEffect, useState } from 'react';
import Axios from 'axios';
import type { IAltinnWindow } from '../../types/global';
import type {OnTranslationChange} from '../../../language-editor';

const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
const basePath = `${altinnWindow.location.origin}/designer/api/v2/${altinnWindow.org}/${altinnWindow.app}/texts`;

const getLoadTextResourcesUrl = (languageCode: string) => {
  return `${basePath}/${languageCode}`;
};

export const getSaveTextResourcesUrl = (languageCode: string) => {
  return `${basePath}/${languageCode}`;
};

export const useGetLanguages = () => {
  const [language, setLanguage] = useState(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      const [nb] = await Promise.all([
        Axios.get(getLoadTextResourcesUrl('nb')),
      ]);

      setLanguage(nb.data);
    };

    fetchLanguages();
  }, []);
  return { language };
};

export async function updateLanguage({ translations }: OnTranslationChange) {
  await Axios.put(getLoadTextResourcesUrl('nb'), translations);
}
