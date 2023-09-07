import React, { useContext, createContext, useState, useEffect } from 'react';

import axios from 'axios';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
interface PreviewContextProps {
  isReady: boolean;
  data: any;
}

const Context = createContext<Partial<PreviewContextProps>>({});

export const PreviewContext = (props: any) => {
  const { org, app } = useStudioUrlParams();
  const [isReady, setIsReady] = useState<boolean>(false);
  const [data, setData] = useState<undefined>();
  useEffect(() => {
    axios
      .get(`/${org}/${app}/preview/preview-status`)
      .then((result) => setData(result.data))
      .finally(() => setIsReady(true));
  }, [app, org]);
  return <Context.Provider value={{ isReady, data }}>{props.children}</Context.Provider>;
};

export const usePreviewContext = () => useContext(Context);
