import { type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

export class WSConnector {
  private connection: HubConnection;
  private static instance: WSConnector;
  private clientsName: string[] = [];

  constructor(
    private readonly webSocketUrl: string,
    clientsName: string[],
  ) {
    this.createConnection(this.webSocketUrl);
    this.startConnection();
    this.clientsName = clientsName;
  }

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(webSocketUrl: string, clientsName: string[]): WSConnector {
    if (!WSConnector.instance) {
      WSConnector.instance = new WSConnector(webSocketUrl, clientsName);
    }
    return WSConnector.instance;
  }

  public onMessageReceived<T>(callback: (message: T) => void): void {
    this.clientsName.forEach((clientName) => {
      this.connection.on(clientName, (message: T) => callback(message));
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
