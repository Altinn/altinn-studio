"""LLM client for Altinity agents"""
import json
import asyncio
import mlflow
from typing import Dict, Any, Optional, List, Tuple
from langchain_openai import (
    AzureChatOpenAI,
    ChatOpenAI,
    AzureOpenAI as LangchainAzureOpenAI,
    OpenAI as LangchainOpenAI,
)
from openai import AzureOpenAI as AzureResponsesClient, OpenAI as OpenAIResponsesClient
from langchain_core.messages import SystemMessage, HumanMessage
from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger
from shared.models import AgentAttachment
from agents.prompts import get_prompt_content

log = get_logger(__name__)
config = get_config()

class LLMClient:
    """Client for LLM operations with role-based model selection"""

    def __init__(self, role: str = "default"):
        """
        Initialize LLM client with role-specific configuration
        
        Args:
            role: Agent role (planner, actor, reviewer, verifier, default)
        """
        self.role = role
        
        # Select model, version, and temperature based on role
        model: Optional[str] = None
        model_version: Optional[str] = None
        temperature: Optional[float] = None
        self.use_completions = False
        self.use_responses = False
        self.responses_client = None

        if role == "planner":
            model = config.LLM_MODEL_PLANNER
            model_version = config.LLM_VERSION_PLANNER
            if config.LLM_TEMPERATURE_PLANNER is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_PLANNER)
                except ValueError:
                    log.warning(
                        "Invalid planner temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_PLANNER,
                    )
        elif role == "tool_planner":
            model = config.LLM_MODEL_TOOL_PLANNER
            model_version = config.LLM_VERSION_TOOL_PLANNER
            if config.LLM_TEMPERATURE_TOOL_PLANNER is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_TOOL_PLANNER)
                except ValueError:
                    log.warning(
                        "Invalid tool planner temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_TOOL_PLANNER,
                    )
            self.use_completions = bool(config.LLM_TOOL_PLANNER_USE_COMPLETIONS)
            self.use_responses = bool(config.LLM_TOOL_PLANNER_USE_RESPONSES)
            if self.use_completions and self.use_responses:
                log.warning("Both completions and responses modes requested for tool planner; defaulting to responses")
                self.use_completions = False
        elif role == "actor":
            model = config.LLM_MODEL_ACTOR
            model_version = config.LLM_VERSION_ACTOR
            if config.LLM_TEMPERATURE_ACTOR is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_ACTOR)
                except ValueError:
                    log.warning(
                        "Invalid actor temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_ACTOR,
                    )
        elif role == "reviewer":
            model = config.LLM_MODEL_REVIEWER
            model_version = config.LLM_VERSION_REVIEWER
            if config.LLM_TEMPERATURE_REVIEWER is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_REVIEWER)
                except ValueError:
                    log.warning(
                        "Invalid reviewer temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_REVIEWER,
                    )
        elif role == "verifier":
            model = config.LLM_MODEL_VERIFIER
            model_version = config.LLM_VERSION_VERIFIER
            if config.LLM_TEMPERATURE_VERIFIER is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_VERIFIER)
                except ValueError:
                    log.warning(
                        "Invalid verifier temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_VERIFIER,
                    )
        elif role == "assistant":
            model = config.LLM_MODEL_ASSISTANT
            model_version = config.LLM_VERSION_ASSISTANT
            if config.LLM_TEMPERATURE_ASSISTANT is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE_ASSISTANT)
                except ValueError:
                    log.warning(
                        "Invalid assistant temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE_ASSISTANT,
                    )
        else:
            model = config.AZURE_DEPLOYMENT_NAME if config.AZURE_API_KEY else config.LLM_MODEL
            model_version = None
            if config.LLM_TEMPERATURE is not None:
                try:
                    temperature = float(config.LLM_TEMPERATURE)
                except ValueError:
                    log.warning(
                        "Invalid default temperature %s; falling back to provider default",
                        config.LLM_TEMPERATURE,
                    )
        
        self.model_version = model_version
        self.model = model
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE

        # Prefer Azure OpenAI if available
        if config.AZURE_API_KEY:
            version_info = f", version={model_version}" if model_version else ""
            log.info(
                f"Using Azure OpenAI for LLM operations (role={role}, model={model}{version_info}, temperature={temperature if temperature is not None else 'default'})"
            )

            llm_params = {
                "azure_endpoint": config.AZURE_ENDPOINT,
                "api_key": config.AZURE_API_KEY,
                "api_version": config.AZURE_API_VERSION,
                "deployment_name": model,
            }

            if temperature is not None and temperature != 1.0:
                llm_params["temperature"] = temperature

            if self.use_responses:
                try:
                    self.responses_client = AzureResponsesClient(
                        azure_endpoint=config.AZURE_ENDPOINT,
                        api_key=config.AZURE_API_KEY,
                        api_version=config.AZURE_API_VERSION,
                    )
                except Exception as exc:
                    log.error(f"Failed to initialize Azure Responses client: {exc}")
                    raise
                self.llm = None
            elif self.use_completions:
                self.llm = LangchainAzureOpenAI(**llm_params)
            else:
                self.llm = AzureChatOpenAI(**llm_params)
        elif config.OPENAI_API_KEY and config.OPENAI_API_KEY != "your_openai_api_key_here":
            log.info(
                f"Using OpenAI for LLM operations (role={role}, model={model}, temperature={temperature if temperature is not None else 'default'})"
            )
            chat_kwargs = {
                "api_key": config.OPENAI_API_KEY,
                "model": model,
            }
            if temperature is not None:
                chat_kwargs["temperature"] = temperature
            if self.use_responses:
                try:
                    self.responses_client = OpenAIResponsesClient(api_key=config.OPENAI_API_KEY)
                except Exception as exc:
                    log.error(f"Failed to initialize OpenAI Responses client: {exc}")
                    raise
                self.llm = None
            elif self.use_completions:
                self.llm = LangchainOpenAI(**chat_kwargs)
            else:
                self.llm = ChatOpenAI(**chat_kwargs)
        else:
            log.warning("No LLM API key configured - LLM features will be limited")
            self.llm = None

        self.supports_vision: bool = getattr(config, "LLM_SUPPORTS_VISION", True) and not (self.use_completions or self.use_responses)

    def _format_completion_prompt(self, system_prompt: str, user_prompt: str) -> str:
        if system_prompt.strip():
            return f"{system_prompt.strip()}\n\n{user_prompt.strip()}"
        return user_prompt.strip()

    def _build_responses_input(self, system_prompt: str, user_prompt: str) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = []
        if system_prompt and system_prompt.strip():
            messages.append({"role": "system", "content": system_prompt.strip()})
        messages.append({"role": "user", "content": user_prompt.strip()})
        return messages

    def _extract_responses_text(self, response: Any) -> str:
        if response is None:
            return ""
        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()

        output = getattr(response, "output", None)
        if output:
            for item in output:
                content = getattr(item, "content", None)
                if not content:
                    continue
                for block in content:
                    block_text = getattr(block, "text", None)
                    if isinstance(block_text, str) and block_text.strip():
                        return block_text.strip()

        if hasattr(response, "to_dict"):
            try:
                data = response.to_dict()
                if isinstance(data, dict):
                    maybe_text = data.get("output_text") or data.get("text")
                    if isinstance(maybe_text, str):
                        return maybe_text.strip()
            except Exception:
                pass

        return str(response)

    def _build_human_message(self, user_prompt: str, attachments: Optional[List[AgentAttachment]] = None) -> HumanMessage:
        if attachments and not self.supports_vision:
            log.warning(
                "Attachments provided but model %s does not support multimodal input; attachments will be ignored.",
                self.model,
            )
        if attachments:
            content = [{"type": "text", "text": user_prompt}]
            for attachment in attachments:
                block = attachment.to_content_block()
                if block:
                    content.append(block)
            return HumanMessage(content=content)
        return HumanMessage(content=user_prompt)

    async def call_async(self, system_prompt: str, user_prompt: str, attachments: Optional[List[AgentAttachment]] = None, timeout: int = 300) -> str:
        """
        Make async LLM call with timeout
        
        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            attachments: Optional list of attachments
            timeout: Timeout in seconds (default: 300s / 5 minutes)
        """
        if self.llm is None and not self.use_responses:
            raise ValueError("LLM not configured - please set OPENAI_API_KEY")

        try:
            loop = asyncio.get_event_loop()
            if self.use_responses:
                if attachments:
                    log.warning("Attachments provided but responses model does not support them; ignoring attachments")
                input_messages = self._build_responses_input(system_prompt, user_prompt)

                def _call_responses():
                    return self.responses_client.responses.create(
                        model=self.model,
                        input=input_messages,
                    )

                response = await asyncio.wait_for(
                    loop.run_in_executor(None, _call_responses),
                    timeout=timeout
                )
                return self._extract_responses_text(response)
            elif self.llm is None:
                raise ValueError("LLM client not initialized")
            elif self.use_completions:
                if attachments:
                    log.warning("Attachments provided but completion model does not support them; ignoring attachments")
                prompt = self._format_completion_prompt(system_prompt, user_prompt)
                response = await asyncio.wait_for(
                    loop.run_in_executor(None, self.llm.invoke, prompt),
                    timeout=timeout
                )
                return response.strip() if isinstance(response, str) else str(response)
            else:
                messages = [
                    SystemMessage(content=system_prompt),
                    self._build_human_message(user_prompt, attachments)
                ]
                response = await asyncio.wait_for(
                    loop.run_in_executor(None, self.llm.invoke, messages),
                    timeout=timeout
                )
                return response.content.strip()
        except asyncio.TimeoutError:
            log.error(f"LLM call timed out after {timeout} seconds (role={self.role}, model={self.model})")
            raise TimeoutError(f"LLM call timed out after {timeout} seconds. This may be due to network issues, Azure API throttling, or an oversized request.")
        except Exception as e:
            log.error(f"LLM call failed: {e}")
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
            if self.model_version:
                metadata["model_version"] = str(self.model_version)
            return metadata
        except Exception as e:
            log.warning(f"Error getting model metadata: {e}")
            return {
                "role": str(self.role),
                "model": "unknown",
                "temperature": 0.1
            }
    
    def call_sync(
        self, 
        system_message: str, 
        user_message: str, 
        attachments: Optional[List[AgentAttachment]] = None,
        conversation_history: Optional[List] = None
    ) -> str:
        """
        Synchronous call to LLM
        
        Args:
            system_message: System prompt
            user_message: User message (current question)
            attachments: Optional attachments for vision models
            conversation_history: Optional list of prior messages (dicts with 'role' and 'content')
        
        Returns:
            Response text
        """
        with mlflow.start_span(name=f"llm_call_{self.role}", span_type="LLM") as span:
            # Set inputs
            span.set_inputs({
                "system_message": system_message,
                "user_message": user_message,
                "role": self.role,
                "model_metadata": self.get_model_metadata(),
                "attachment_count": len(attachments) if attachments else 0,
                "attachment_names": [att.name for att in attachments] if attachments else []
            })

            try:
                if self.use_responses:
                    if attachments:
                        log.warning("Attachments provided but responses model does not support them; ignoring attachments")
                    input_messages = self._build_responses_input(system_message, user_message)
                    response = self.responses_client.responses.create(
                        model=self.model,
                        input=input_messages,
                    )
                    response_text = self._extract_responses_text(response)
                elif self.llm is None:
                    raise ValueError("LLM client not initialized")
                elif self.use_completions:
                    if attachments:
                        log.warning("Attachments provided but completion model does not support them; ignoring attachments")
                    prompt = self._format_completion_prompt(system_message, user_message)
                    response = self.llm.invoke(prompt)
                    response_text = response if isinstance(response, str) else str(response)
                else:
                    # Build messages array with conversation history
                    messages = [SystemMessage(content=system_message)]
                    
                    # Add conversation history if provided
                    if conversation_history:
                        from langchain_core.messages import AIMessage
                        for msg in conversation_history:
                            if msg.role == "user":
                                messages.append(HumanMessage(content=msg.content))
                            elif msg.role == "assistant":
                                messages.append(AIMessage(content=msg.content))
                    
                    # Add current user message
                    messages.append(self._build_human_message(user_message, attachments))
                    
                    response = self.llm.invoke(messages)
                    response_text = response.content
                
                # Set outputs
                span.set_outputs({"response": response_text})
                
                # Set attributes for better tracing
                span.set_attribute("request_length", len(system_message) + len(user_message))
                span.set_attribute("response_length", len(response_text))
                if self.use_responses:
                    usage = getattr(response, "usage", None)
                    if usage:
                        span.set_attribute("tokens_prompt", getattr(usage, "input_tokens", 0))
                        span.set_attribute("tokens_completion", getattr(usage, "output_tokens", 0))
                        span.set_attribute("tokens_total", getattr(usage, "total_tokens", 0))
                elif hasattr(response, 'response_metadata'):
                    if 'token_usage' in response.response_metadata:
                        usage = response.response_metadata['token_usage']
                        span.set_attribute("tokens_prompt", usage.get('prompt_tokens', 0))
                        span.set_attribute("tokens_completion", usage.get('completion_tokens', 0))
                        span.set_attribute("tokens_total", usage.get('total_tokens', 0))
                
                return response_text
                
            except Exception as e:
                span.set_attribute("error", str(e))
                raise


# Global client cache to reuse instances
_clients: Dict[Tuple[str, ...], LLMClient] = {}
_client_keys: Dict[str, Tuple[str, ...]] = {}


def _build_cache_key(role: str) -> Tuple[str, ...]:
    if role == "tool_planner":
        return (
            role,
            str(config.LLM_MODEL_TOOL_PLANNER),
            str(config.LLM_VERSION_TOOL_PLANNER),
            str(config.LLM_TEMPERATURE_TOOL_PLANNER),
            str(config.LLM_TOOL_PLANNER_USE_COMPLETIONS),
            str(config.LLM_TOOL_PLANNER_USE_RESPONSES),
        )
    if role == "planner":
        return (
            role,
            str(config.LLM_MODEL_PLANNER),
            str(config.LLM_VERSION_PLANNER),
            str(config.LLM_TEMPERATURE_PLANNER),
        )
    if role == "actor":
        return (
            role,
            str(config.LLM_MODEL_ACTOR),
            str(config.LLM_VERSION_ACTOR),
            str(config.LLM_TEMPERATURE_ACTOR),
        )
    if role == "reviewer":
        return (
            role,
            str(config.LLM_MODEL_REVIEWER),
            str(config.LLM_VERSION_REVIEWER),
            str(config.LLM_TEMPERATURE_REVIEWER),
        )
    if role == "verifier":
        return (
            role,
            str(config.LLM_MODEL_VERIFIER),
            str(config.LLM_VERSION_VERIFIER),
            str(config.LLM_TEMPERATURE_VERIFIER),
        )
    return (
        role,
        str(config.LLM_MODEL),
        str(config.AZURE_DEPLOYMENT_NAME),
        str(config.LLM_TEMPERATURE),
    )


def get_llm_client(role: str = "default") -> LLMClient:
    """
    Get or create LLM client instance for specific role
    
    Args:
        role: Agent role (planner, actor, reviewer, verifier, default)
        
    Returns:
        LLMClient configured for the specified role
    """
    key = _build_cache_key(role)
    cached = _client_keys.get(role)
    if cached == key and role in _clients:
        return _clients[role]

    client = LLMClient(role=role)
    _clients[role] = client
    _client_keys[role] = key
    return client

async def parse_intent_with_llm(goal: str, attachments: Optional[List[AgentAttachment]] = None) -> Dict[str, Any]:
    """Parse user intent using LLM"""
    system_prompt = get_prompt_content("intent_security")

    user_prompt = f"Parse this goal: {goal}"

    client = get_llm_client()
    response = await client.call_async(system_prompt, user_prompt, attachments=attachments)

    cleaned_response = response.strip()
    if cleaned_response.startswith("```"):
        fence_end = cleaned_response.find("\n")
        first_line = cleaned_response[:fence_end] if fence_end != -1 else cleaned_response
        if first_line.startswith("```json"):
            cleaned_response = cleaned_response[len("```json"):].strip()
        else:
            cleaned_response = cleaned_response[len("```"):].strip()
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
            "reason": "Failed to parse intent"
        }

def suggest_goals_with_llm(unclear_goal: str) -> list[str]:
    """Generate goal suggestions using LLM"""
    system_prompt = get_prompt_content("goal_suggestions")

    user_prompt = f"Suggest clear goals similar to: {unclear_goal}"

    try:
        client = get_llm_client()
        response = client.call_sync(system_prompt, user_prompt)

        # Split response into lines and clean up
        suggestions = [line.strip().lstrip('- ') for line in response.split('\n') if line.strip()]
        return suggestions[:3]  # Limit to 3 suggestions

    except Exception as e:
        log.error(f"Failed to generate suggestions: {e}")
        return [
            "add a text field myField to layout main",
            "add a numeric field totalAmount to layout form bound to model.amount",
            "add a button submitBtn to layout main"
        ]