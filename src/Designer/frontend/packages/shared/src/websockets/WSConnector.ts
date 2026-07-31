import { HttpTransportType, type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { WSConnectorMissingWebSocketUrlsException } from 'app-shared/websockets/WSConnectorMissingWebSocketUrlsException';

export class WSConnector {
  private connections: Array<HubConnection> = [];
  private static instances: Map<string, WSConnector> = new Map();
  private clientsName: Array<string> = [];

  constructor(
    private readonly webSocketUrls: Array<string>,
    clientsName: Array<string>,
  ) {
    this.createMultipleConnections(this.webSocketUrls);
    this.startConnections();
    this.clientsName = clientsName;
  }

  // Singleton per hub set: independent features (sync hub, Altinity hub)
  // each get one shared connection for their URLs without clobbering each
  // other. A single global instance would hand the second feature the first
  // feature's connection.
  public static getInstance(webSocketUrls: Array<string>, clientsName: Array<string>): WSConnector {
    const instanceKey = [...webSocketUrls].sort().join(';');
    let instance = WSConnector.instances.get(instanceKey);
    if (!instance) {
      instance = new WSConnector(webSocketUrls, clientsName);
      WSConnector.instances.set(instanceKey, instance);
    }
    return instance;
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
          withCredentials: true,
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
