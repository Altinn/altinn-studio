import { useEffect, useState } from 'react';
import Axios from 'axios';
import type { IAltinnWindow } from '../../types/global';

const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
const basePath = `${altinnWindow.location.origin}/designer/api/v2/${altinnWindow.org}/${altinnWindow.app}/texts`;

const getLoadTextResourcesUrl = (languageCode: string) => {
  return `${basePath}/${languageCode}`;
};

export const getSaveTextResourcesUrl = (languageCode: string) => {
  return `${basePath}/${languageCode}`;
};

export const useGetLanguages = () => {
  const [languages, setLanguages] = useState(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      const [nb] = await Promise.all([
        Axios.get(getLoadTextResourcesUrl('nb')),
      ]);

      setLanguages({
        ...(nb.data && { 'Norwegian Bokmal': nb.data }),
      });
    };

    fetchLanguages();
  }, []);
  return { languages };
};

export async function updateLanguage({ languages, translationKey, e }: any) {
  await Axios.put(getLoadTextResourcesUrl('nb'), {
    ...languages['Norwegian Bokmal'],
    [translationKey]: e.target.value,
  });
}
