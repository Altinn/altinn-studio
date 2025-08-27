class HubConnection {
  public on(methodName: string, callback: () => string): Promise<void> {
    this.successCallback = callback;
    return Promise.resolve();
  }

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public successCallback: () => string = () => 'failure';

  public send(websocket: string, message: string): Promise<void> {
    return Promise.resolve();
  }
}

class HubConnectionBuilder {
  public withUrl(url: string) {
    return {
      configureLogging: () => ({
        build: () => new HubConnection(),
      }),
    };
  }
}

const LogLevel = {
  Information: 'information',
};

export const SignalR = {
  HubConnectionBuilder: HubConnectionBuilder,
  LogLevel: LogLevel,
};
