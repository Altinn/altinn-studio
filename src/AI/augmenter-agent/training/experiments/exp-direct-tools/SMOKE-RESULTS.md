# Sandkasse smoke-resultater (Phase 0)

- Endepunkt: `https://gw.sandkasse.ai/v1/chat/completions`
- Modell: `telenor:gemma4`
- Kjøretidspunkt: 2026-05-20 10:41:08

## pong

**Resultat:** PASS  (200, 1969ms)

```json
{
  "name": "pong",
  "status_code": 200,
  "elapsed_ms": 1969,
  "content": "PONG"
}
```

## tools

**Resultat:** PASS  (200, 649ms)

```json
{
  "name": "tools",
  "status_code": 200,
  "elapsed_ms": 649,
  "tool_calls_count": 1,
  "first_tool_call": {
    "id": "chatcmpl-tool-923e481192917840",
    "type": "function",
    "function": {
      "name": "add_two_numbers",
      "arguments": "{\"a\": 27, \"b\": 15}"
    }
  },
  "content_if_no_tools": "",
  "finish_reason": "tool_calls",
  "verdict": "TOOLS_SUPPORTED"
}
```

## stream

**Resultat:** PASS  (200, 248ms)

```json
{
  "name": "stream",
  "status_code": 200,
  "elapsed_ms": 248,
  "content_type": "text/event-stream; charset=utf-8",
  "sse_event_count": 6,
  "first_event": "data: {\"id\":\"chatcmpl-32a105b8-55e6-423d-953b-e57f88848fbb\",\"object\":\"chat.completion.chunk\",\"created\":1779266469,\"model\":\"telenor:gemma4\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"",
  "last_event": "data: [DONE]",
  "assembled_content": "PONG"
}
```
