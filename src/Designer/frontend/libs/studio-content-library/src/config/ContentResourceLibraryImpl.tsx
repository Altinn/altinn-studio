import React from 'react';
import type { PagesConfig } from '../types/PagesProps';
import { ContentLibrary } from '../ContentLibrary/ContentLibrary';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';
import type { ContentLibraryRouter } from '../types/ContentLibraryRouter';

export class ResourceContentLibraryImpl {
  private readonly pages: PagesConfig;
  private readonly heading: string;
  private readonly navigation: ContentLibraryRouter;

  constructor(config: ContentLibraryConfig) {
    this.pages = config.pages;
    this.heading = config.heading;
    this.navigation = config.router;
    this.getContentResourceLibrary = this.getContentResourceLibrary.bind(this);
  }

  public getContentResourceLibrary(): React.ReactNode {
    return <ContentLibrary heading={this.heading} router={this.navigation} pages={this.pages} />;
  }
}
