import React from 'react';
import type { Provider } from 'react';
import type { ContentLibraryRouter } from '../types/ContentLibraryRouter';
import { Guard } from '@studio/guard';

const RouterContext = React.createContext<ContentLibraryRouter | null>(null);

export const RouterContextProvider: Provider<ContentLibraryRouter> = RouterContext.Provider;

export function useRouterContext(): ContentLibraryRouter {
  const context = React.useContext(RouterContext);
  Guard.againstNull(context);
  return context;
}
