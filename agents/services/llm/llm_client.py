"""LLM client for Altinity agents"""
import json
import asyncio
import mlflow
from typing import Dict, Any, Optional, List
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger
from shared.models import AgentAttachment

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
        elif role == "actor":
            model = config.LLM_MODEL_ACTOR
            model_version = config.LLM_VERSION_ACTOR
            temperature = config.LLM_TEMPERATURE_ACTOR
        elif role == "reviewer":
            model = config.LLM_MODEL_REVIEWER
            model_version = config.LLM_VERSION_REVIEWER
            temperature = config.LLM_TEMPERATURE_REVIEWER
        elif role == "verifier":
            model = config.LLM_MODEL_VERIFIER
            model_version = config.LLM_VERSION_VERIFIER
            temperature = config.LLM_TEMPERATURE_VERIFIER
        else:
            model = config.AZURE_DEPLOYMENT_NAME if config.AZURE_API_KEY else config.LLM_MODEL
            model_version = None
            temperature = config.LLM_TEMPERATURE
        
        self.model_version = model_version
        self.model = model
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE

        # Prefer Azure OpenAI if available
        if config.AZURE_API_KEY:
            version_info = f", version={model_version}" if model_version else ""
            log.info(
                f"Using Azure OpenAI for LLM operations (role={role}, model={model}{version_info}, temperature={temperature if temperature is not None else 'default'})"
            )

            # For reasoning models (gpt-5, o1, o3), temperature must be 1.0 or unset
            llm_params = {
                "azure_endpoint": config.AZURE_ENDPOINT,
                "api_key": config.AZURE_API_KEY,
                "api_version": config.AZURE_API_VERSION,
                "deployment_name": model,
            }

            # Only set temperature if explicitly configured and not 1.0 (reasoning models use default=1.0)
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
            if temperature is not None:
                chat_kwargs["temperature"] = temperature
            self.llm = ChatOpenAI(**chat_kwargs)
        else:
            log.warning("No LLM API key configured - LLM features will be limited")
            self.llm = None

        self.supports_vision: bool = getattr(config, "LLM_SUPPORTS_VISION", True)

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

    async def call_async(self, system_prompt: str, user_prompt: str, attachments: Optional[List[AgentAttachment]] = None) -> str:
        """Make async LLM call"""
        if self.llm is None:
            raise ValueError("LLM not configured - please set OPENAI_API_KEY")

        try:
            messages = [
                SystemMessage(content=system_prompt),
                self._build_human_message(user_prompt, attachments)
            ]

            # Run in thread pool since LangChain doesn't have native async for ChatOpenAI
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, self.llm.invoke, messages)
            return response.content.strip()
        except Exception as e:
            log.error(f"LLM call failed: {e}")
            raise

    def get_model_metadata(self) -> dict:
        """Get model metadata for tracing"""
        try:
            model_name = (
                self.llm.deployment_name
                if hasattr(self.llm, "deployment_name")
                else self.llm.model_name
                if hasattr(self.llm, "model_name")
                else "unknown"
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
    
    def call_sync(self, system_message: str, user_message: str, attachments: Optional[List[AgentAttachment]] = None) -> str:
        """
        Synchronous call to LLM
        
        Args:
            system_message: System prompt
            user_message: User message
        
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

            messages = [
                SystemMessage(content=system_message),
                self._build_human_message(user_message, attachments)
            ]
            
            try:
                response = self.llm.invoke(messages)
                response_text = response.content
                
                # Set outputs
                span.set_outputs({"response": response_text})
                
                # Set attributes for better tracing
                span.set_attribute("request_length", len(system_message) + len(user_message))
                span.set_attribute("response_length", len(response_text))
                if hasattr(response, 'response_metadata'):
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
_clients = {}


def get_llm_client(role: str = "default") -> LLMClient:
    """
    Get or create LLM client instance for specific role
    
    Args:
        role: Agent role (planner, actor, reviewer, verifier, default)
        
    Returns:
        LLMClient configured for the specified role
    """
    global _clients
    if role not in _clients:
        _clients[role] = LLMClient(role=role)
    return _clients[role]

async def parse_intent_with_llm(goal: str, attachments: Optional[List[AgentAttachment]] = None) -> Dict[str, Any]:
    """Parse user intent using LLM"""
# TODO: Move this to system_prompts
    system_prompt = """You are an intent parser for Altinn app development goals.
Parse the user's goal into structured intent information.

The user may provide attachments (PDFs, images, etc.) as supporting context.
Treat references to attachments or images as normal Altinn workflow requirements.
Do NOT mark the goal unsafe merely because it requires interpreting an attachment or
because it mentions data models, text resources, or other standard Altinn assets.

SAFE ACTIONS: add, update, modify, create, insert
SAFE COMPONENTS: field, input, text, label, button, validation, layout, form, display, component

DANGEROUS PATTERNS:
- delete, remove, drop, truncate, destroy, wipe, clear, reset operations
- system, admin, root, config, secret, key, password, token references
- operations outside of UI components and layouts

Return JSON with:
{
  "action": "add|update|modify|create|blocked",
  "component": "field|layout|button|validation|unknown",
  "target": "specific target description",
  "details": {"binding": "model.path", "type": "text|numeric|boolean", "layout": "layoutName"},
  "confidence": 0.0-1.0,
  "safe": true|false,
  "reason": "explanation if unsafe or low confidence"
}

Examples:
- "add a text field totalWeight to layout main" → action: add, component: field, safe: true
- "delete all user data" → action: blocked, safe: false, reason: dangerous operation
- "field something" → action: unknown, safe: false, reason: unclear goal"""

    user_prompt = f"Parse this goal: {goal}"

    client = get_llm_client()
    response = await client.call_async(system_prompt, user_prompt, attachments=attachments)

    try:
        # Parse JSON response
        parsed = json.loads(response)
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
# TODO: Move this to system_prompts
    system_prompt = """Generate 2-3 clear, safe goal examples for Altinn app development based on the unclear goal.

Focus on common Altinn operations:
- Adding form fields (text, numeric, date, etc.)
- Creating buttons and validation
- Modifying layouts and components
- Binding fields to data models

Return a simple list of example goals, one per line."""

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