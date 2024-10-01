import React from 'react';
import type { PageConfig } from '../types/PagesProps';
import { RouterPage } from '../pages/RouterPage';
import { RouterContextProvider } from '../contexts/RouterContext';

export class ResourceContentLibraryImpl {
  private readonly pages: Partial<PageConfig>;

  constructor(config: { pages: Partial<PageConfig> }) {
    this.pages = config.pages;
    this.getContentResourceLibrary = this.getContentResourceLibrary.bind(this);
  }

  public getContentResourceLibrary(): React.ReactNode {
    return (
      <RouterContextProvider>
        <RouterPage pages={this.pages} />
      </RouterContextProvider>
    );
  }
}
