import React from 'react';
import type { ReactElement } from 'react';
import { RouterContextProvider } from '../contexts/RouterContext';
import { ContentLibrary } from '../ContentLibrary/ContentLibrary';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';

export type ContentLibraryWithProviderProps = Readonly<ContentLibraryConfig>;

export function ContentLibraryWithProvider(props: ContentLibraryWithProviderProps): ReactElement {
  return (
    <RouterContextProvider>
      <ContentLibrary {...props} />
    </RouterContextProvider>
  );
}
