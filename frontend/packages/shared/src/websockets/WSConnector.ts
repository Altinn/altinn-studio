import { type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

export class WSConnector {
  private connection: HubConnection;
  private static instance: WSConnector;
  private socketMessageListeners: string[] = [];

  constructor(
    private readonly webSocketUrl: string,
    socketMessageListeners: string[],
  ) {
    this.createConnection(this.webSocketUrl);
    this.startConnection();
    this.socketMessageListeners = socketMessageListeners;
  }

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(webSocketUrl: string, socketMessageListeners: string[]): WSConnector {
    if (!WSConnector.instance) {
      WSConnector.instance = new WSConnector(webSocketUrl, socketMessageListeners);
    }
    return WSConnector.instance;
  }

  public onMessageReceived<T>(callback: (message: T) => void): void {
    this.socketMessageListeners.forEach((listener) => {
      this.connection.on(listener, (message: T) => callback(message));
    });
  }

  private createConnection(webSocketUrl: string): void {
    this.connection = new HubConnectionBuilder()
      .withUrl(webSocketUrl)
      .withAutomaticReconnect()
      .build();
  }

  private startConnection(): void {
    this.connection.start().catch((e) => console.error('Connection failed: ', e));
  }
}
