"""Intent parsing and validation for user goals"""
# TODO: Not sure if this is necessary at all 
import asyncio
from typing import Dict, List, Optional
from shared.models import AgentAttachment
from pydantic import BaseModel
from .llm_client import parse_intent_with_llm, suggest_goals_with_llm
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

class ParsedIntent(BaseModel):
    """Structured representation of user intent"""
    action: str  # add, remove, update, move
    component: str  # field, layout, validation, etc.
    target: str  # specific target like "layout main", "field totalWeight"
    details: Dict[str, str] = {}  # additional details like type, binding
    confidence: float = 0.0  # confidence in parsing (0-1)
    safe: bool = True  # whether this intent is considered safe
    reason: Optional[str] = None  # reason if not safe or low confidence

class IntentParsingError(Exception):
    pass

async def parse_intent_async(goal: str, attachments: Optional[List[AgentAttachment]] = None) -> ParsedIntent:
    """Parse user goal into structured intent using LLM with safety checks"""
    
    # Quick safety check before LLM processing
    is_safe, safety_reason = _validate_goal_safety_quick(goal)
    if not is_safe:
        return ParsedIntent(
            action="blocked",
            component="unknown", 
            target=goal,
            safe=False,
            confidence=1.0,  # We're certain it's unsafe
            reason=safety_reason
        )
    
    try:
        result = await parse_intent_with_llm(goal, attachments=attachments)
        
        # Validate LLM response structure
        parsed = ParsedIntent(
            action=result.get("action", "unknown"),
            component=result.get("component", "unknown"),
            target=result.get("target", goal),
            details=result.get("details", {}),
            confidence=max(0.0, min(1.0, result.get("confidence", 0.0))),  # Clamp to [0,1]
            safe=result.get("safe", False),
            reason=result.get("reason")
        )
        
        # Additional validation - ensure confidence makes sense
        if parsed.action == "unknown" and parsed.confidence > 0.5:
            parsed.confidence = 0.5  # Cap confidence for unknown actions
            
        # Log if the intent parser marked something unsafe (should only be security threats now)
        if not parsed.safe:
            log.warning(f"Intent parser flagged goal as unsafe: {parsed.reason}")
            
        return parsed
        
    except Exception as e:
        log.error(f"LLM intent parsing failed: {e}")
        return ParsedIntent(
            action="error",
            component="unknown",
            target=goal,
            safe=False,
            confidence=0.0,
            reason=f"Intent parsing failed: {str(e)}"
        )

def parse_intent(goal: str, attachments: Optional[List[AgentAttachment]] = None) -> ParsedIntent:
    """Synchronous wrapper for intent parsing - requires working LLM"""
    try:
        # Check if we're already in an async context
        try:
            loop = asyncio.get_running_loop()
            # We're in an async context, cannot use sync wrapper
            raise Exception("Cannot use sync parse_intent from async context - use parse_intent_async instead")
        except RuntimeError:
            # No running loop, safe to create one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(parse_intent_async(goal, attachments=attachments))
                return result
            finally:
                loop.close()
    except Exception as e:
        log.error(f"Intent parsing failed: {e}")
        raise

def validate_goal_safety(goal: str) -> tuple[bool, Optional[str]]:
    """Comprehensive safety check for user goals"""
    
    # First, quick safety check without LLM
    is_safe, safety_reason = _validate_goal_safety_quick(goal)
    if not is_safe:
        return False, safety_reason
    
    try:
        # Full LLM-based parsing and validation
        parsed = parse_intent(goal, attachments=attachments)

        if not parsed.safe:
            return False, parsed.reason

        if parsed.confidence < 0.3:
            return False, "Goal is too unclear or ambiguous"

        if parsed.action == "blocked":
            return False, parsed.reason or "Goal was blocked by safety filters"
            
        if parsed.action == "error":
            return False, parsed.reason or "Goal could not be processed"

        return True, None
        
    except Exception as e:
        log.error(f"Goal validation failed: {e}")
        return False, f"Could not validate goal: {str(e)}"

def _validate_goal_safety_quick(goal: str) -> tuple[bool, Optional[str]]:
    """Quick safety check for dangerous keywords before LLM processing"""
    goal_lower = goal.lower().strip()
    
    # Hard safety blocks - focus on truly destructive or security-sensitive patterns
    dangerous_patterns = [
        "drop database",
        "drop table",
        "truncate table",
        "truncate database",
        "destroy server",
        "destroy environment",
        "wipe database",
        "wipe server",
        "format disk",
        "shutdown production",
        "kill process",
        "disable auth",
        "exfiltrate"
    ]

    for pattern in dangerous_patterns:
        if pattern in goal_lower:
            return False, f"Contains potentially dangerous pattern: {pattern}"

    credential_keywords = {"api key", "secret", "password", "token", "credential"}
    for keyword in credential_keywords:
        if keyword in goal_lower:
            return False, f"Contains sensitive keyword: {keyword}"
    
    return True, None

def suggest_goal_correction(goal: str) -> List[str]:
    """Suggest corrections for unclear or unsafe goals using LLM"""
    try:
        return suggest_goals_with_llm(goal)
    except Exception as e:
        log.error(f"Failed to get LLM suggestions: {e}")
        raise Exception(f"Goal suggestions require working LLM connection: {str(e)}")