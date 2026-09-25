"""LLM client for Altinity agents"""

import asyncio
import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langfuse import get_client

from agents.prompts import get_prompt_with_langfuse
from shared.config.base_config import get_config
from shared.models import AgentAttachment
from shared.utils.langfuse_utils import trace_generation
from shared.utils.logging_utils import get_logger
from shared.utils.spotlight import (
    ATTACHMENT_TAG,
    close_delimiter,
    defang_delimiter,
    open_delimiter,
)

log = get_logger(__name__)
config = get_config()


def _is_claude_model(model_name: str | None) -> bool:
    """Check if model name indicates a Claude/Anthropic model"""
    if not model_name:
        return False
    model_lower = model_name.lower()
    return model_lower.startswith("claude") or "anthropic" in model_lower


def _is_reasoning_model(model_name: str | None) -> bool:
    """Check if model is a reasoning model that uses internal reasoning tokens."""
    if not model_name:
        return False
    m = model_name.lower()
    # o1, o1-mini, o1-preview, o3, o3-mini, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-pro
    return m.startswith(("o1", "o3", "gpt-5"))


ATTACHMENT_PAYLOAD_FIELDS = frozenset({"data", "file_data", "url"})


def _defang_attachment_value(value: Any) -> Any:
    """Defang every string in a block; base64 payloads cannot contain the delimiter."""
    if isinstance(value, str):
        return defang_delimiter(value, ATTACHMENT_TAG)
    if isinstance(value, dict):
        return {
            key: item if key in ATTACHMENT_PAYLOAD_FIELDS else _defang_attachment_value(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_defang_attachment_value(item) for item in value]
    return value


def _defang_attachment_blocks(blocks: list[dict]) -> list[dict]:
    """Stop an attachment closing the block it sits inside."""
    return [_defang_attachment_value(block) for block in blocks]


def _build_anthropic_user_content(
    user_prompt: str,
    attachments: list[AgentAttachment] | None,
) -> Any:
    """Compose an Anthropic Messages-API `content` value."""
    stripped = user_prompt.strip() if user_prompt else ""
    if not attachments:
        return stripped
    blocks: list[dict] = [{"type": "text", "text": stripped}] if stripped else []
    blocks.append({"type": "text", "text": open_delimiter(ATTACHMENT_TAG)})
    for attachment in attachments:
        blocks.extend(_defang_attachment_blocks(attachment.to_anthropic_blocks()))
    blocks.append({"type": "text", "text": close_delimiter(ATTACHMENT_TAG)})
    return blocks


class LLMClient:
    """Client for LLM operations with role-based model selection"""

    def __init__(self, role: str = "default", max_tokens: int | None = None):
        """Initialize LLM client with role-specific configuration  Args: role: Agent role (planner, default) max_tokens: Maximum tokens for response."""
        self.role = role

        # Select model and temperature based on role
        model: str | None = None
        temperature: float | None = None

        if role == "planner":
            model = config.LLM_MODEL_PLANNER
            if config.LLM_TEMPERATURE_PLANNER is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_PLANNER)
                except ValueError:
                    log.warning(
                        "Invalid planner temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_PLANNER,
                    )
        else:
            # Default fallback — used by parse_intent_with_llm /
            # suggest_goals_with_llm, which call get_llm_client() with no role.
            model = config.AZURE_DEPLOYMENT_NAME if config.AZURE_API_KEY else config.LLM_MODEL
            if config.LLM_TEMPERATURE is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE)
                except ValueError:
                    log.warning(
                        "Invalid default temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE,
                    )
        self.model = model
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE
        self.use_anthropic = False
        self.anthropic_client = None
        self.is_reasoning_model = _is_reasoning_model(model)

        # Set max_tokens based on role and model type
        if max_tokens is not None:
            self.max_tokens = max_tokens
        elif self.is_reasoning_model:
            # Reasoning models (gpt-5, o1, o3) use internal reasoning tokens that
            # consume the max_tokens budget. With 8192, the model may spend all tokens
            # on reasoning and return empty output. Use 32768 to leave ample room.
            self.max_tokens = 32768
            log.info(f"Reasoning model detected ({model}), using max_tokens={self.max_tokens}")
        else:
            self.max_tokens = 8192

        # Check if this is a Claude model - use Anthropic SDK instead of OpenAI
        if _is_claude_model(model):
            self._init_anthropic_client(role, model, temperature)
        # Prefer Azure OpenAI if available
        elif config.AZURE_API_KEY:
            log.info(
                f"Using Azure OpenAI for LLM operations (role={role}, model={model}, temperature={temperature if temperature is not None else 'default'})"
            )

            llm_params = {
                "azure_endpoint": config.AZURE_OPENAI_ENDPOINT,
                "api_key": config.AZURE_API_KEY,
                "api_version": config.AZURE_API_VERSION,
                "deployment_name": model,
            }
            # Reasoning models take the budget as `max_completion_tokens`.
            if self.is_reasoning_model:
                # Reasoning models: use low effort to preserve tokens for output.
                # They also don't support the temperature parameter.
                llm_params["model_kwargs"] = {
                    "reasoning_effort": config.LLM_REASONING_EFFORT,
                    "max_completion_tokens": self.max_tokens,
                }
            else:
                llm_params["max_tokens"] = self.max_tokens
                if temperature is not None and temperature != 1.0:
                    llm_params["temperature"] = temperature

            self.llm = AzureChatOpenAI(**llm_params)
        elif config.OPENAI_API_KEY and config.OPENAI_API_KEY != "your_openai_api_key_here":
            log.info(
                f"Using OpenAI for LLM operations (role={role}, model={model}, temperature={temperature if temperature is not None else 'default'})"
            )
            chat_kwargs = {
                "api_key": config.OPENAI_API_KEY,
                "model": model,
            }
            if self.is_reasoning_model:
                chat_kwargs["model_kwargs"] = {
                    "reasoning_effort": config.LLM_REASONING_EFFORT,
                    "max_completion_tokens": self.max_tokens,
                }
            else:
                chat_kwargs["max_tokens"] = self.max_tokens
                if temperature is not None:
                    chat_kwargs["temperature"] = temperature
            self.llm = ChatOpenAI(**chat_kwargs)
        else:
            log.warning("No LLM API key configured - LLM features will be limited")
            self.llm = None

        self.supports_vision: bool = getattr(config, "LLM_SUPPORTS_VISION", True) and not self.use_anthropic

    def _init_anthropic_client(self, role: str, model: str, temperature: float | None) -> None:
        """Initialize Anthropic/Claude client for Azure AI Foundry or direct Anthropic API"""
        try:
            from anthropic import Anthropic
        except ImportError as e:
            raise ImportError("anthropic package not installed. Install with: pip install anthropic") from e

        # Check if we should use Azure AI Foundry or direct Anthropic
        if config.AZURE_ANTHROPIC_ENDPOINT and config.AZURE_ANTHROPIC_API_KEY:
            # Azure AI Foundry - use Anthropic client with custom base_url
            log.info(
                f"Using Anthropic via Azure AI Foundry for LLM operations "
                f"(role={role}, model={model}, endpoint={config.AZURE_ANTHROPIC_ENDPOINT}, "
                f"temperature={temperature if temperature is not None else 'default'})"
            )
            self.anthropic_client = Anthropic(
                api_key=config.AZURE_ANTHROPIC_API_KEY,
                base_url=config.AZURE_ANTHROPIC_ENDPOINT,
                timeout=600.0,  # 10 minutes for large patch synthesis tasks
            )
        elif config.ANTHROPIC_API_KEY:
            # Direct Anthropic API
            log.info(
                f"Using direct Anthropic API for LLM operations "
                f"(role={role}, model={model}, temperature={temperature if temperature is not None else 'default'})"
            )
            self.anthropic_client = Anthropic(
                api_key=config.ANTHROPIC_API_KEY,
                timeout=600.0,  # 10 minutes for large patch synthesis tasks
            )
        else:
            raise ValueError(
                "No API key configured for Anthropic/Claude. "
                "Set AZURE_ANTHROPIC_ENDPOINT with AZURE_ANTHROPIC_API_KEY, which "
                "falls back to AZURE_API_KEY when both endpoints are on one resource, "
                "or ANTHROPIC_API_KEY for the direct Anthropic API."
            )

        self.use_anthropic = True
        self.llm = None  # Not using LangChain for Anthropic

    def _extract_anthropic_text(self, response: Any) -> str:
        """Extract text content from Anthropic API response"""
        if response is None:
            return ""

        # Anthropic response has content array with text blocks
        content = getattr(response, "content", None)
        if content:
            text_parts = []
            for block in content:
                if getattr(block, "type", None) == "text":
                    text = getattr(block, "text", "")
                    if text:
                        text_parts.append(text)
            if text_parts:
                return "\n".join(text_parts).strip()

        # Fallback to string representation
        return str(response)

    def _build_human_message(self, user_prompt: str, attachments: list[AgentAttachment] | None = None) -> HumanMessage:
        if attachments and not self.supports_vision:
            log.warning(
                "Attachments provided but model %s does not support multimodal input; attachments will be ignored.",
                self.model,
            )
        if attachments:
            content = [{"type": "text", "text": user_prompt}]
            content.append({"type": "text", "text": open_delimiter(ATTACHMENT_TAG)})
            for attachment in attachments:
                content.extend(_defang_attachment_blocks(attachment.to_content_blocks()))
            content.append({"type": "text", "text": close_delimiter(ATTACHMENT_TAG)})
            return HumanMessage(content=content)
        return HumanMessage(content=user_prompt)

    async def call_async(
        self,
        system_prompt: str,
        user_prompt: str,
        attachments: list[AgentAttachment] | None = None,
        timeout: int = 300,
        langfuse_prompt=None,
    ) -> str:
        """Make async LLM call with timeout"""
        if self.llm is None and not self.use_anthropic:
            raise ValueError("LLM not configured - please set OPENAI_API_KEY or configure Anthropic")

        langfuse = get_client()
        with langfuse.start_as_current_observation(
            name=f"llm_call_{self.role}",
            as_type="generation",
            model=self.model,
            input={
                "system_message": system_prompt,
                "user_message": user_prompt,
                "role": self.role,
                "model_metadata": self.get_model_metadata(),
                "attachment_count": len(attachments) if attachments else 0,
                "attachment_names": [att.name for att in attachments] if attachments else [],
            },
            metadata={"role": self.role},
        ) as span:
            if langfuse_prompt is not None:
                try:
                    langfuse.update_current_generation(prompt=langfuse_prompt)
                except Exception as e:
                    log.debug("Failed to link langfuse prompt to generation: %s", e)

            try:
                loop = asyncio.get_running_loop()
                response_text = ""
                usage_details = {}

                if self.use_anthropic:
                    user_content = _build_anthropic_user_content(user_prompt, attachments)

                    def _call_anthropic():
                        return self.anthropic_client.messages.create(
                            model=self.model,
                            system=system_prompt.strip() if system_prompt else "",
                            messages=[{"role": "user", "content": user_content}],
                            max_tokens=self.max_tokens,
                        )

                    response = await asyncio.wait_for(loop.run_in_executor(None, _call_anthropic), timeout=timeout)
                    response_text = self._extract_anthropic_text(response)
                    usage = getattr(response, "usage", None)
                    if usage:
                        usage_details = {
                            "input_tokens": getattr(usage, "input_tokens", 0),
                            "output_tokens": getattr(usage, "output_tokens", 0),
                            "total_tokens": getattr(usage, "input_tokens", 0) + getattr(usage, "output_tokens", 0),
                        }
                elif self.llm is None:
                    raise ValueError("LLM client not initialized")
                else:
                    messages = [
                        SystemMessage(content=system_prompt),
                        self._build_human_message(user_prompt, attachments),
                    ]
                    response = await asyncio.wait_for(
                        loop.run_in_executor(None, self.llm.invoke, messages), timeout=timeout
                    )
                    response_text = response.content.strip()
                    if hasattr(response, "response_metadata") and "token_usage" in response.response_metadata:
                        usage = response.response_metadata["token_usage"]
                        usage_details = {
                            "input_tokens": usage.get("prompt_tokens", 0),
                            "output_tokens": usage.get("completion_tokens", 0),
                            "total_tokens": usage.get("total_tokens", 0),
                        }

                try:
                    span.update(
                        output={"response": response_text},
                        usage_details=usage_details if usage_details else None,
                        metadata={
                            "request_length": len(system_prompt) + len(user_prompt),
                            "response_length": len(response_text),
                        },
                    )
                except Exception as span_e:
                    log.debug("Failed to update Langfuse span with response: %s", span_e)
                return response_text

            except TimeoutError as e:
                log.error(f"LLM call timed out after {timeout} seconds (role={self.role}, model={self.model})")
                try:
                    span.update(metadata={"error": "timeout"})
                except Exception as span_e:
                    log.debug("Failed to update Langfuse span with timeout error: %s", span_e)
                raise TimeoutError(
                    f"LLM call timed out after {timeout} seconds. This may be due to network issues, Azure API throttling, or an oversized request."
                ) from e
            except Exception as e:
                log.error(f"LLM call failed: {e}")
                try:
                    span.update(metadata={"error": str(e)})
                except Exception as span_e:
                    log.debug("Failed to update Langfuse span with error: %s", span_e)
                raise

    def get_model_metadata(self) -> dict:
        """Get model metadata for tracing"""
        try:
            model_name = self.model or (
                self.llm.deployment_name
                if hasattr(self.llm, "deployment_name")
                else getattr(self.llm, "model_name", "unknown")
            )

            llm_temp = getattr(self.llm, "temperature", None)
            if llm_temp is None:
                llm_temp = self.temperature if self.temperature is not None else config.LLM_TEMPERATURE

            metadata = {
                "role": str(self.role),
                "model": str(model_name),
                "temperature": float(llm_temp) if llm_temp is not None else 0.1,
            }
            return metadata
        except Exception as e:
            log.warning(f"Error getting model metadata: {e}")
            return {"role": str(self.role), "model": "unknown", "temperature": 0.1}

    def call_sync(
        self,
        system_message: str,
        user_message: str,
        attachments: list[AgentAttachment] | None = None,
        langfuse_prompt=None,
    ) -> str:
        """Synchronous call to LLM  Args: system_message: System prompt user_message: User message (current question) attachments: Optional attachments for vision models  Returns: Response text"""
        with trace_generation(
            f"llm_call_{self.role}",
            model=self.model,
            input={
                "system_message": system_message,
                "user_message": user_message,
                "role": self.role,
                "model_metadata": self.get_model_metadata(),
                "attachment_count": len(attachments) if attachments else 0,
                "attachment_names": [att.name for att in attachments] if attachments else [],
            },
            metadata={"role": self.role},
        ) as span:
            langfuse = get_client()
            if langfuse_prompt is not None:
                try:
                    langfuse.update_current_generation(prompt=langfuse_prompt)
                except Exception as e:
                    log.debug("Failed to link langfuse prompt to generation: %s", e)

            try:
                if self.use_anthropic:
                    user_content = _build_anthropic_user_content(user_message, attachments)

                    import time

                    system_len = len(system_message.strip() if system_message else "")
                    user_len = len(user_message.strip())
                    log.info("🔵 Anthropic API call starting")
                    log.info(
                        f"   System: {system_len} chars, User: {user_len} chars, "
                        f"Attachments: {len(attachments) if attachments else 0}"
                    )
                    log.info(f"   Model: {self.model}, Max tokens: {self.max_tokens}")
                    log.info("   Client timeout: 600s (10 min)")
                    if isinstance(user_content, list):
                        log.info(
                            "   Content blocks: %s",
                            ", ".join(block["type"] for block in user_content),
                        )

                    call_start = time.time()
                    try:
                        response = self.anthropic_client.messages.create(
                            model=self.model,
                            system=system_message.strip() if system_message else "",
                            messages=[{"role": "user", "content": user_content}],
                            max_tokens=self.max_tokens,
                        )
                        call_elapsed = time.time() - call_start
                        log.info(f"✅ Anthropic API call succeeded in {call_elapsed:.1f}s")
                    except Exception as api_error:
                        call_elapsed = time.time() - call_start
                        log.error(f"❌ Anthropic API call failed after {call_elapsed:.1f}s")
                        log.error(f"   Error type: {type(api_error).__name__}")
                        log.error(f"   Error: {api_error}")
                        if "408" in str(api_error) or "Timeout" in str(api_error):
                            log.error("   ⚠️  AZURE GATEWAY TIMEOUT DETECTED")
                            log.error("   The Azure AI Foundry gateway has a ~4 minute timeout limit")
                            log.error(f"   Your request took {call_elapsed:.1f}s before timing out")
                            log.error("   Possible solutions:")
                            log.error("   1. Reduce input size (smaller PDF, fewer tool results)")
                            log.error(f"   2. Reduce max_tokens (currently {self.max_tokens})")
                            log.error("   3. Use streaming API (not yet implemented)")
                            log.error("   4. Split task into smaller subtasks")
                        raise

                    response_text = self._extract_anthropic_text(response)
                elif self.llm is None:
                    raise ValueError("LLM client not initialized")
                else:
                    messages = [
                        SystemMessage(content=system_message),
                        self._build_human_message(user_message, attachments),
                    ]

                    response = self.llm.invoke(messages)
                    response_text = response.content

                    # Detect empty/filtered responses
                    if not response_text or not response_text.strip():
                        finish_reason = None
                        if hasattr(response, "response_metadata"):
                            finish_reason = response.response_metadata.get("finish_reason")
                        log.warning(
                            f"⚠️ LLM returned empty response (role={self.role}, model={self.model}, "
                            f"finish_reason={finish_reason}, "
                            f"metadata={getattr(response, 'response_metadata', {})})"
                        )

                # Set outputs and usage details
                usage_details = {}
                if self.use_anthropic:
                    usage = getattr(response, "usage", None)
                    if usage:
                        usage_details = {
                            "input_tokens": getattr(usage, "input_tokens", 0),
                            "output_tokens": getattr(usage, "output_tokens", 0),
                            "total_tokens": getattr(usage, "input_tokens", 0) + getattr(usage, "output_tokens", 0),
                        }
                elif hasattr(response, "response_metadata"):
                    if "token_usage" in response.response_metadata:
                        usage = response.response_metadata["token_usage"]
                        usage_details = {
                            "input_tokens": usage.get("prompt_tokens", 0),
                            "output_tokens": usage.get("completion_tokens", 0),
                            "total_tokens": usage.get("total_tokens", 0),
                        }

                try:
                    span.update(
                        output={"response": response_text},
                        usage_details=usage_details if usage_details else None,
                        metadata={
                            "request_length": len(system_message) + len(user_message),
                            "response_length": len(response_text),
                        },
                    )
                except Exception as span_e:
                    log.debug("Failed to update Langfuse span with response: %s", span_e)

                return response_text

            except Exception as e:
                try:
                    span.update(metadata={"error": str(e)})
                except Exception as span_e:
                    log.debug("Failed to update Langfuse span with error: %s", span_e)
                raise


# Global client cache to reuse instances
_clients: dict[tuple[str, ...], LLMClient] = {}
_client_keys: dict[str, tuple[str, ...]] = {}


def _build_cache_key(role: str) -> tuple[str, ...]:
    if role == "planner":
        return (
            role,
            str(config.LLM_MODEL_PLANNER),
            str(config.LLM_TEMPERATURE_PLANNER),
        )
    return (
        role,
        str(config.LLM_MODEL),
        str(config.AZURE_DEPLOYMENT_NAME),
        str(config.LLM_TEMPERATURE),
    )


def get_llm_client(role: str = "default") -> LLMClient:
    """Get or create LLM client instance for specific role"""
    key = _build_cache_key(role)
    cached = _client_keys.get(role)
    if cached == key and role in _clients:
        return _clients[role]

    client = LLMClient(role=role)
    _clients[role] = client
    _client_keys[role] = key
    return client


def build_intent_parse_message(goal: str, attachment_names: list[str] | None = None) -> str:
    """The user message the safety gate sees, as a value so a dataset can send
    exactly what production sends."""
    message = f"Parse this goal: {goal}"
    if attachment_names:
        names = ", ".join(attachment_names)
        message = f"{message}\n\nAttachment filenames (content not shown): {names}"
    return message


async def parse_intent_with_llm(goal: str, attachments: list[AgentAttachment] | None = None) -> dict[str, Any]:
    """Parse user intent using LLM."""
    system_prompt, lf_prompt = get_prompt_with_langfuse("intent_check", local_path="intent_security")
    user_prompt = build_intent_parse_message(goal, [a.name for a in attachments] if attachments else None)

    client = get_llm_client()
    response = await client.call_async(system_prompt, user_prompt, langfuse_prompt=lf_prompt)

    cleaned_response = response.strip()
    if cleaned_response.startswith("```"):
        fence_end = cleaned_response.find("\n")
        first_line = cleaned_response[:fence_end] if fence_end != -1 else cleaned_response
        if first_line.startswith("```json"):
            cleaned_response = cleaned_response[len("```json") :].strip()
        else:
            cleaned_response = cleaned_response[len("```") :].strip()
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3].strip()

    try:
        # Parse JSON response
        parsed = json.loads(cleaned_response)
        return parsed
    except json.JSONDecodeError:
        log.warning(f"Failed to parse LLM response as JSON: {response}")
        return {
            "action": "unknown",
            "component": "unknown",
            "target": goal,
            "details": {},
            "confidence": 0.0,
            "safe": False,
            "reason": "Failed to parse intent",
        }


def suggest_goals_with_llm(rejected_goal: str, rejection_reason: str | None = None) -> list[str]:
    """Generate goal suggestions using LLM"""
    system_prompt, lf_prompt = get_prompt_with_langfuse("goal_suggestions")

    # "Similar to" is what made the suggestions restate the rejected goal.
    user_prompt = (
        f"This goal was rejected: {rejected_goal}\n"
        f"Reason: {rejection_reason}\n"
        "Suggest goals the user could ask for instead. Do not restate the rejected goal."
        if rejection_reason
        else f"This goal was unclear: {rejected_goal}\nSuggest clearer goals the user could ask for instead."
    )
    # The chips sit next to a rejection written in the user's language.
    user_prompt += "\nWrite them in the same language as the goal above.\nOne goal per line, no numbering."

    try:
        client = get_llm_client()
        response = client.call_sync(system_prompt, user_prompt, langfuse_prompt=lf_prompt)

        # Split response into lines and clean up
        suggestions = [line.strip().lstrip("- ") for line in response.split("\n") if line.strip()]
        return suggestions[:3]  # Limit to 3 suggestions

    except Exception as e:
        # The old fallbacks were English examples shown to Norwegian users.
        log.error(f"Failed to generate suggestions: {e}")
        return []
