import { HttpTransportType, type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { WSConnectorMissingWebSocketUrlsException } from 'app-shared/websockets/WSConnectorMissingWebSocketUrlsException';

export class WSConnector {
  private connections: Array<HubConnection> = [];
  private static instances: Map<string, WSConnector> = new Map();
  private clientsName: Array<string> = [];
  private startPromises: Array<Promise<void>> = [];

  constructor(
    private readonly webSocketUrls: Array<string>,
    clientsName: Array<string>,
  ) {
    this.createMultipleConnections(this.webSocketUrls);
    this.startConnections();
    this.clientsName = clientsName;
  }

  // Keyed by URL only, so the first caller's clientsName wins.
  public static getInstance(webSocketUrls: Array<string>, clientsName: Array<string>): WSConnector {
    const instanceKey = [...webSocketUrls].sort().join(';');
    let instance = WSConnector.instances.get(instanceKey);
    if (!instance) {
      instance = new WSConnector(webSocketUrls, clientsName);
      WSConnector.instances.set(instanceKey, instance);
    }
    return instance;
  }

  // Callers must unsubscribe, or handlers stack on the shared connection.
  public onMessageReceived<T>(callback: (message: T) => void): () => void {
    const handler = (message: T) => callback(message);
    this.forEachClientConnection((clientName, connection) => connection.on(clientName, handler));
    return () =>
      this.forEachClientConnection((clientName, connection) => connection.off(clientName, handler));
  }

  private forEachClientConnection(
    action: (clientName: string, connection: HubConnection) => void,
  ): void {
    this.clientsName.forEach((clientName) => {
      this.connections.forEach((connection) => action(clientName, connection));
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

  public whenStarted(): Promise<void> {
    return Promise.all(this.startPromises).then(() => undefined);
  }

  private startConnections(): void {
    this.connections.forEach((connection: HubConnection) => this.startConnection(connection));
  }

  private startConnection(connection: HubConnection): void {
    this.startPromises.push(
      connection.start().catch((e) => console.error('Connection failed: ', e)),
    );
  }
}
