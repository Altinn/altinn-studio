export class WSConnectorMissingWebSocketUrlsException extends Error {
  constructor(
    message = 'No WebSocket URLs provided. WebSocket urls needed to connect to the WS Server',
  ) {
    super(message);
    this.name = 'WSConnectorMissingWebSocketUrlsException';
  }
}
