import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

export class WSConnector {
  private connection: HubConnection;
  private static instance: WSConnector;

  constructor(private readonly webSocketUrl: string) {
    this.createConnection(this.webSocketUrl);
    this.startConnection();
  }

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(webSocketUrl: string): WSConnector {
    if (!WSConnector.instance) {
      WSConnector.instance = new WSConnector(webSocketUrl);
    }
    return WSConnector.instance;
  }

  private createConnection(webSocketUrl: string): void {
    this.connection = new HubConnectionBuilder()
      .withUrl(webSocketUrl)
      .withAutomaticReconnect()
      .build();
  }

  private startConnection(): void {
    this.connection.start().catch((e) => console.log('Connection failed: ', e));
  }
}
