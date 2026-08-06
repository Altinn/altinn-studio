import { HttpTransportType, type HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

const connectionsByUrl: Map<string, HubConnection> = new Map();

export function getHubConnection(webSocketUrl: string): HubConnection {
  const existingConnection = connectionsByUrl.get(webSocketUrl);
  if (existingConnection) return existingConnection;

  const connection = createConnection(webSocketUrl);
  connectionsByUrl.set(webSocketUrl, connection);
  return connection;
}

function createConnection(webSocketUrl: string): HubConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(webSocketUrl, {
      skipNegotiation: true,
      transport: HttpTransportType.WebSockets,
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .build();
  connection.start().catch((error) => console.error('Connection failed: ', error));
  return connection;
}
