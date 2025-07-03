import React from 'react';
import type { PagesConfig } from '../types/PagesProps';
import { RouterContextProvider } from '../contexts/RouterContext';
import { ContentLibrary } from '../ContentLibrary/ContentLibrary';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';

export class ResourceContentLibraryImpl {
  private readonly pages: PagesConfig;
  private readonly heading: string;

  constructor(config: ContentLibraryConfig) {
    this.pages = config.pages;
    this.heading = config.heading;
    this.getContentResourceLibrary = this.getContentResourceLibrary.bind(this);
  }

  public getContentResourceLibrary(): React.ReactNode {
    return (
      <RouterContextProvider>
        <ContentLibrary heading={this.heading} pages={this.pages} />
      </RouterContextProvider>
    );
  }
}
