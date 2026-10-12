# API layer

Code: `api/main.py`, `api/routes/agent.py`, `api/routes/websocket.py`, `api/rate_limiting.py`

`api/main.py` makes the FastAPI app and adds the routes. At startup it starts Langfuse and gives the event sink a reference to the main event loop. The start route needs two headers: `X-Api-Key` (else 401) and `X-Developer` (else 400). A sliding-window limiter counts starts for each developer and for all developers.

```mermaid
flowchart TD
  A["Check rate limits and headers"] --> B["Clone the repo for the session"]
  B --> C["Save attachments to disk"]
  C --> D["Make AgentState with the stored history"]
  D --> E["Start run_in_background, return accepted"]
```

_The steps in `POST /api/agent/start`._

The WebSocket handler does not use callbacks. It pulls events from a buffer with a cursor. It waits on an `asyncio.Event` for new events, for a maximum of 30 seconds each time.

```mermaid
sequenceDiagram
  participant D as Designer
  participant W as WebSocket handler
  participant S as EventSink
  D->>W: Connect
  W-->>D: type=connection
  D->>W: type=session with developer
  W->>S: register_developer_session
  loop until the socket closes
    W->>S: get_developer_events_since(cursor)
    W-->>D: One JSON frame for each event
    W->>S: wait_for_developer_events, max 30 s
  end
```

_The `/ws` handler. The cursor starts at the end of the buffer, so old events are not sent again._
