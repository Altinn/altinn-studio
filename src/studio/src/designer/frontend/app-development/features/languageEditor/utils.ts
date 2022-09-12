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
        // Axios.get(getLoadTextResourcesUrl('en')),
        Axios.get(getLoadTextResourcesUrl('nb')),
        // Axios.get(getLoadTextResourcesUrl('nn')),
      ]);

      /* eslint-disable-next-line */
      /* @ts-ignore */
      setLanguages({
        // ...(en.data && { Engelsk: en.data }),
        ...(nb.data && { Bokmal: nb.data }),
        // ...(nn.data && { Nynorsk: nn.data }),
      });
    };

    fetchLanguages();
  }, []);

  return { languages };
};
