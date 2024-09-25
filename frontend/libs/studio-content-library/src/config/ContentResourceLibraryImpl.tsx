import React from 'react';
import { PageConfig } from '../types/PagesProps';
import { RouterPage } from '../pages/RouterPage';
import { RouterContextProvider } from '../contexts/RouterContext';

export class ResourceContentLibraryImpl {
  private readonly pages: PageConfig;

  constructor(config: { pages: PageConfig }) {
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
