import React, { createContext, useCallback, useContext, useState } from 'react';

export type PreviewContextProps = {
  shouldReloadPreview: boolean;
  doReloadPreview: () => void;
  previewHasLoaded: () => void;
};

export const PreviewContext = createContext<Partial<PreviewContextProps>>(undefined);

export type PreviewContextProviderProps = {
  children: React.ReactNode;
};

export const PreviewContextProvider = ({ children }: Partial<PreviewContextProviderProps>) => {
  const [shouldReloadPreview, setShouldReloadPreview] = useState<boolean>(false);

  // The editors' save callbacks depend on these, so a reload must not give them new ones.
  const doReloadPreview = useCallback(() => {
    setShouldReloadPreview(true);
  }, []);

  const previewHasLoaded = useCallback(() => {
    setShouldReloadPreview(false);
  }, []);

  return (
    <PreviewContext.Provider
      value={{
        shouldReloadPreview,
        doReloadPreview,
        previewHasLoaded,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreviewContext = (): Partial<PreviewContextProps> => {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error('usePreviewContext must be used within a PreviewContextProvider');
  }
  return context;
};
