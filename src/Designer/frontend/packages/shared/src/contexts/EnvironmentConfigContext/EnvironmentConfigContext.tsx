import type { ReactNode, ReactElement } from 'react';
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import { get } from 'app-shared/utils/networking';
import { envFilePath } from 'app-shared/api/paths';

type EnvironmentConfigContextValue = {
  environment: AltinnStudioEnvironment | null;
  isPending: boolean;
  error: Error | null;
};

const EnvironmentConfigContext = createContext<EnvironmentConfigContextValue | null>(null);

export type EnvironmentConfigProviderProps = {
  children: ReactNode;
};

export const EnvironmentConfigProvider = ({
  children,
}: EnvironmentConfigProviderProps): ReactElement => {
  const { data, isPending, error } = useQuery({
    queryKey: ['environmentConfig'],
    queryFn: fetchEnvironmentConfig,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const contextValue: EnvironmentConfigContextValue = {
    environment: data ?? null,
    isPending,
    error,
  };

  return (
    <EnvironmentConfigContext.Provider value={contextValue}>
      {children}
    </EnvironmentConfigContext.Provider>
  );
};

export const useEnvironmentConfig = (): EnvironmentConfigContextValue => {
  const context = useContext(EnvironmentConfigContext);
  if (context === null) {
    throw new Error('useEnvironmentConfig must be used within an EnvironmentConfigProvider');
  }
  return context;
};

async function fetchEnvironmentConfig(): Promise<AltinnStudioEnvironment | null> {
  try {
    return await get<AltinnStudioEnvironment>(envFilePath());
  } catch (error) {
    console.warn(
      'Could not load environment file. This is expected for local dev environments.',
      error,
    );
    return null;
  }
}
