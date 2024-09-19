export class PageConfigImpl {
  constructor(pages: PageConfig) {}

  public getRoutes() {
    return [
      {
        path: 'home',
        title: 'Home',
      },
    ];
  }

  // TODO add a method for mapping routes
}
