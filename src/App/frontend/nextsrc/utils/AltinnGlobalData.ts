interface AltinnGlobalWindowData {
  org: string;
  app: string;
}

export class AltinnGlobalData {
  public static get org(): string {
    return AltinnGlobalData.typedWindow.org;
  }

  public static get app(): string {
    return AltinnGlobalData.typedWindow.app;
  }

  private static get typedWindow(): AltinnGlobalWindowData {
    return window as unknown as AltinnGlobalWindowData;
  }
}
