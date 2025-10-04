"""LLM client for Altinity agents"""
import json
import asyncio
import mlflow
from typing import Dict, Any, Optional
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger

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
        if role == "planner":
            model = config.LLM_MODEL_PLANNER
            model_version = config.LLM_VERSION_PLANNER
            temperature = config.LLM_TEMPERATURE_PLANNER
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
        
        # Prefer Azure OpenAI if available
        if config.AZURE_API_KEY:
            version_info = f", version={model_version}" if model_version else ""
            log.info(f"Using Azure OpenAI for LLM operations (role={role}, model={model}{version_info}, temp={temperature})")
            
            # For reasoning models (gpt-5, o1, o3), temperature must be 1.0 or unset
            llm_params = {
                "azure_endpoint": config.AZURE_ENDPOINT,
                "api_key": config.AZURE_API_KEY,
                "api_version": config.AZURE_API_VERSION,
                "deployment_name": model,
            }
            
            # Only set temperature if it's not 1.0 (reasoning models use default=1.0)
            if temperature != 1.0:
                llm_params["temperature"] = temperature
            
            self.llm = AzureChatOpenAI(**llm_params)
        elif config.OPENAI_API_KEY and config.OPENAI_API_KEY != "your_openai_api_key_here":
            log.info(f"Using OpenAI for LLM operations (role={role}, model={model}, temp={temperature})")
            self.llm = ChatOpenAI(
                api_key=config.OPENAI_API_KEY,
                model=model,
                temperature=temperature
            )
        else:
            log.warning("No LLM API key configured - LLM features will be limited")
            self.llm = None

    async def call_async(self, system_prompt: str, user_prompt: str) -> str:
        """Make async LLM call"""
        if self.llm is None:
            raise ValueError("LLM not configured - please set OPENAI_API_KEY")

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
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
            metadata = {
                "role": str(self.role),
                "model": str(self.llm.deployment_name if hasattr(self.llm, 'deployment_name') else self.llm.model_name if hasattr(self.llm, 'model_name') else "unknown"),
                "temperature": float(self.llm.temperature) if hasattr(self.llm, 'temperature') else 0.1
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
    
    def call_sync(self, system_message: str, user_message: str) -> str:
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
                "model_metadata": self.get_model_metadata()
            })
            
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=user_message)
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

async def parse_intent_with_llm(goal: str) -> Dict[str, Any]:
    """Parse user intent using LLM"""

    system_prompt = """You are an intent parser for Altinn app development goals.
Parse the user's goal into structured intent information.

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
    response = await client.call_async(system_prompt, user_prompt)

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