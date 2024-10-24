import React from 'react';
import type { PagesConfig } from '../types/PagesProps';
import { RouterContextProvider } from '../contexts/RouterContext';
import { ContentLibrary } from '../ContentLibrary/ContentLibrary';

export class ResourceContentLibraryImpl {
  private readonly pages: PagesConfig;

  constructor(config: { pages: PagesConfig }) {
    this.pages = config.pages;
    this.getContentResourceLibrary = this.getContentResourceLibrary.bind(this);
  }

  public getContentResourceLibrary(): React.ReactNode {
    return (
      <RouterContextProvider>
        <ContentLibrary pages={this.pages} />
      </RouterContextProvider>
    );
  }
}
