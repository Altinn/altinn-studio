import { HttpTransportType, type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { WSConnectorMissingWebSocketUrlsException } from 'app-shared/websockets/WSConnectorMissingWebSocketUrlsException';

export class WSConnector {
  private connections: Array<HubConnection> = [];
  private static instance: WSConnector;
  private clientsName: Array<string> = [];

  constructor(
    private readonly webSocketUrls: Array<string>,
    clientsName: Array<string>,
  ) {
    this.createMultipleConnections(this.webSocketUrls);
    this.startConnections();
    this.clientsName = clientsName;
  }

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(webSocketUrls: Array<string>, clientsName: Array<string>): WSConnector {
    if (!WSConnector.instance) {
      WSConnector.instance = new WSConnector(webSocketUrls, clientsName);
    }
    return WSConnector.instance;
  }

  public onMessageReceived<T>(callback: (message: T) => void): void {
    this.clientsName.forEach((clientName) => {
      this.connections.forEach((connection) => {
        connection.on(clientName, (message: T) => callback(message));
      });
    });
  }

  private createMultipleConnections(webSocketUrls: Array<string>): void {
    if (!webSocketUrls.length) {
      throw new WSConnectorMissingWebSocketUrlsException();
    }
    webSocketUrls.forEach((webSocketUrl: string) => this.createConnection(webSocketUrl));
  }

  private createConnection(webSocketUrl: string): void {
    this.connections = [
      ...this.connections,
      new HubConnectionBuilder()
        .withUrl(webSocketUrl, {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .build(),
    ];
  }

  private startConnections(): void {
    this.connections.forEach((connection: HubConnection) => this.startConnection(connection));
  }

  private startConnection(connection: HubConnection): void {
    connection.start().catch((e) => console.error('Connection failed: ', e));
  }
}
