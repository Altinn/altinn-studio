"""Direct HTTP client for sandkasse OpenAI-compatible gateway.

Replaces Pi CLI as transport. No third-party deps (urllib only).

Supports:
  - chat(messages)                       — plain completion
  - chat(messages, tools=...)            — tool-calling (returns tool_calls)
  - chat(messages, stream=True)          — SSE, bypasses gateway request-timeout

The `tools` and `stream` paths are independent and composable (you can
stream a tool-calling response — assembled tool_calls are returned at end).

API-key precedence: explicit constructor arg > $SANDKASSE_API_KEY env var
> .env file alongside docker-compose.yaml (four directories up from this script).
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


GATEWAY_URL_DEFAULT = "https://gw.sandkasse.ai/v1/chat/completions"
MODEL_DEFAULT = "telenor:gemma4"
TIMEOUT_S_DEFAULT = 240


@dataclass
class ToolCall:
    id: str
    name: str
    arguments_raw: str  # raw JSON string as returned by the model

    @property
    def arguments(self) -> dict[str, Any]:
        try:
            return json.loads(self.arguments_raw)
        except json.JSONDecodeError:
            return {}


@dataclass
class ChatResponse:
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    finish_reason: str | None = None
    usage: dict[str, Any] = field(default_factory=dict)
    elapsed_ms: int = 0
    status_code: int = 0
    error: str | None = None
    raw: Any = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.status_code == 200


def _load_env_api_key() -> str | None:
    key = os.environ.get("SANDKASSE_API_KEY")
    if key:
        return key
    candidates = [
        Path(__file__).resolve().parents[4] / ".env",
        Path.cwd() / ".env",
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, _, value = line.partition("=")
            if name.strip() == "SANDKASSE_API_KEY":
                return value.strip().strip('"').strip("'")
    return None


class SandkasseClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        gateway_url: str = GATEWAY_URL_DEFAULT,
        default_model: str = MODEL_DEFAULT,
        timeout_s: int = TIMEOUT_S_DEFAULT,
    ) -> None:
        resolved_key = api_key or _load_env_api_key()
        if not resolved_key:
            raise RuntimeError(
                "SANDKASSE_API_KEY not in env and not found in .env. "
                "Pass api_key= explicitly or set the env var."
            )
        self._api_key = resolved_key
        self._gateway_url = gateway_url
        self._default_model = default_model
        self._timeout_s = timeout_s

    def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict | None = None,
        stream: bool = False,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
    ) -> ChatResponse:
        body: dict[str, Any] = {
            "model": model or self._default_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            body["tools"] = tools
            if tool_choice is not None:
                body["tool_choice"] = tool_choice
        if stream:
            body["stream"] = True
            return self._chat_stream(body)
        return self._chat_blocking(body)

    def _chat_blocking(self, body: dict[str, Any]) -> ChatResponse:
        started = time.perf_counter()
        req = self._build_request(body, want_stream=False)
        try:
            with urllib.request.urlopen(req, timeout=self._timeout_s) as resp:
                raw_bytes = resp.read()
                status = resp.status
        except urllib.error.HTTPError as e:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            return ChatResponse(
                status_code=e.code,
                error=f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:500]}",
                elapsed_ms=elapsed_ms,
            )
        except urllib.error.URLError as e:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            return ChatResponse(status_code=-1, error=f"URLError: {e.reason}", elapsed_ms=elapsed_ms)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        try:
            parsed = json.loads(raw_bytes.decode("utf-8"))
        except json.JSONDecodeError as e:
            return ChatResponse(
                status_code=status,
                error=f"Non-JSON response: {e}. Body[:300]={raw_bytes[:300]!r}",
                elapsed_ms=elapsed_ms,
            )

        return self._build_response_from_json(parsed, status, elapsed_ms)

    def _chat_stream(self, body: dict[str, Any]) -> ChatResponse:
        started = time.perf_counter()
        req = self._build_request(body, want_stream=True)
        try:
            with urllib.request.urlopen(req, timeout=self._timeout_s) as resp:
                status = resp.status
                accumulated_content: list[str] = []
                pending_tool_calls: dict[int, dict] = {}  # index -> partial dict
                finish_reason: str | None = None
                usage: dict[str, Any] = {}

                for raw_line in resp:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        evt = json.loads(payload)
                    except json.JSONDecodeError:
                        continue
                    choices = evt.get("choices") or []
                    if choices:
                        choice = choices[0]
                        delta = choice.get("delta") or {}
                        if isinstance(delta.get("content"), str):
                            accumulated_content.append(delta["content"])
                        for tc in delta.get("tool_calls") or []:
                            idx = tc.get("index", 0)
                            slot = pending_tool_calls.setdefault(
                                idx,
                                {"id": "", "name": "", "arguments_raw": ""},
                            )
                            if tc.get("id"):
                                slot["id"] = tc["id"]
                            fn = tc.get("function") or {}
                            if fn.get("name"):
                                slot["name"] = fn["name"]
                            if isinstance(fn.get("arguments"), str):
                                slot["arguments_raw"] += fn["arguments"]
                        if choice.get("finish_reason"):
                            finish_reason = choice["finish_reason"]
                    if evt.get("usage"):
                        usage = evt["usage"]

        except urllib.error.HTTPError as e:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            return ChatResponse(
                status_code=e.code,
                error=f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:500]}",
                elapsed_ms=elapsed_ms,
            )
        except urllib.error.URLError as e:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            return ChatResponse(status_code=-1, error=f"URLError: {e.reason}", elapsed_ms=elapsed_ms)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        tool_calls = [
            ToolCall(id=v["id"], name=v["name"], arguments_raw=v["arguments_raw"])
            for _, v in sorted(pending_tool_calls.items())
            if v.get("name")
        ]
        return ChatResponse(
            content="".join(accumulated_content),
            tool_calls=tool_calls,
            finish_reason=finish_reason,
            usage=usage,
            elapsed_ms=elapsed_ms,
            status_code=status,
        )

    def _build_request(self, body: dict[str, Any], *, want_stream: bool) -> urllib.request.Request:
        return urllib.request.Request(
            self._gateway_url,
            data=json.dumps(body).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
                "Accept": "text/event-stream" if want_stream else "application/json",
            },
        )

    @staticmethod
    def _build_response_from_json(
        parsed: dict[str, Any], status: int, elapsed_ms: int
    ) -> ChatResponse:
        choices = parsed.get("choices") or []
        if not choices:
            return ChatResponse(
                status_code=status,
                error="No choices in response",
                elapsed_ms=elapsed_ms,
                raw=parsed,
            )
        msg = choices[0].get("message") or {}
        tool_calls = []
        for tc in msg.get("tool_calls") or []:
            fn = tc.get("function") or {}
            tool_calls.append(
                ToolCall(
                    id=tc.get("id", ""),
                    name=fn.get("name", ""),
                    arguments_raw=fn.get("arguments") or "",
                )
            )
        return ChatResponse(
            content=msg.get("content") or "",
            tool_calls=tool_calls,
            finish_reason=choices[0].get("finish_reason"),
            usage=parsed.get("usage") or {},
            elapsed_ms=elapsed_ms,
            status_code=status,
            raw=parsed,
        )
