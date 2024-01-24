import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { previewSignalRHubSubPath } from 'app-shared/api/paths';
import type { HubConnection } from '@microsoft/signalr';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const PreviewConnectionContext = createContext<HubConnection>(null);

interface PreviewConnectionContextProviderProps {
  children: ReactNode;
}

export const PreviewConnectionContextProvider = ({
  children,
}: PreviewConnectionContextProviderProps) => {
  const [connection, setConnection] = useState<HubConnection>(null);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl(previewSignalRHubSubPath())
      .configureLogging(LogLevel.Information)
      .build();
    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection.start().catch((e) => console.log('Connection failed: ', e));
    }
  }, [connection]);

  return (
    <PreviewConnectionContext.Provider value={connection}>
      {children}
    </PreviewConnectionContext.Provider>
  );
};

export const usePreviewConnection = function () {
  const connection: HubConnection = useContext(PreviewConnectionContext);
  if (connection === undefined) {
    throw new Error(
      'usePreviewConnectionContext must be used within a PreviewConnectionContextProvider.',
    );
  }
  return connection;
};
