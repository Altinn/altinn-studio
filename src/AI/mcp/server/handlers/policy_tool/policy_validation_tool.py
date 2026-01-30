"""Policy validation tool - returns structured policy data for client-side analysis.

This tool does NOT use server-side LLM. The MCP client LLM should analyze
the returned structured data against the user's requirements.
"""

from typing import Dict, Any, List, Set


def policy_validation_tool(query: str, policy_rules: dict | list) -> dict:
    """
    Returns structured policy data for client-side validation.
    
    The MCP client LLM should analyze the returned rules against the query
    to determine if the policy meets the requirements.
    
    Args:
        query: The user's access control requirements to validate against
        policy_rules: Output from altinn_policy_summarize tool
    
    Returns:
        Structured policy data for client LLM analysis
    """
    if not policy_rules:
        return {
            "status": "error",
            "error_code": "MISSING_PREREQUISITE",
            "message": "No policy_rules provided. Call altinn_policy_summarize first.",
            "hint": "Call altinn_policy_summarize(xml_content) first, then pass its 'rules' output here.",
            "required_flow": "1. altinn_policy_summarize → 2. altinn_policy_validate"
        }

    try:
        # Normalize and extract structured rules
        rules = normalize_rules(policy_rules)
        
        if not rules:
            return {
                "status": "error",
                "error_code": "NO_RULES_FOUND",
                "message": "No valid rules found in policy_rules input."
            }
        
        # Extract unique values for quick reference
        all_roles = extract_unique_values(rules, "roles")
        all_actions = extract_unique_values(rules, "actions")
        all_resources = extract_unique_values(rules, "resources")
        
        return {
            "status": "success",
            "query": query,
            "rule_count": len(rules),
            "rules": rules,
            "summary": {
                "available_roles": sorted(all_roles),
                "available_actions": sorted(all_actions),
                "resources": sorted(all_resources)
            },
            "instructions": (
                "Analyze these rules against the query. For each requirement in the query, "
                "check if there is a matching rule with the correct role and action. "
                "Report which requirements are satisfied and which are missing."
            )
        }
    except Exception as e:
        return {"status": "error", "message": f"Error processing policy rules: {str(e)}"}


def normalize_rules(policy_rules: dict | list) -> List[Dict[str, Any]]:
    """
    Normalize policy rules into a consistent structured format.
    
    Args:
        policy_rules: Either a list of rules or a dict with 'rules' key
        
    Returns:
        List of normalized rule dictionaries
    """
    rules_to_process = []
    
    if isinstance(policy_rules, list):
        rules_to_process = policy_rules
    elif isinstance(policy_rules, dict) and "rules" in policy_rules:
        rules_to_process = policy_rules["rules"]
    else:
        return []
    
    normalized = []
    for rule in rules_to_process:
        if rule.get("type") != "info":
            continue
            
        # Extract roles
        roles = []
        if "role" in rule and rule["role"]:
            for r in rule["role"]:
                role_code = r.get("role") or r.get("value") or "Unknown"
                roles.append(role_code)
        
        # Extract actions
        actions = []
        if "action" in rule and rule["action"]:
            for a in rule["action"]:
                action_value = a.get("value") or "Unknown"
                actions.append(action_value)
        
        # Extract resources
        resources = []
        if "resource" in rule and rule["resource"]:
            for res in rule["resource"]:
                resource_value = res.get("value") or "Unknown"
                resources.append(resource_value)
        
        normalized.append({
            "description": rule.get("message", ""),
            "roles": roles,
            "actions": actions,
            "resources": resources
        })
    
    return normalized


def extract_unique_values(rules: List[Dict[str, Any]], key: str) -> Set[str]:
    """Extract unique values from a specific key across all rules."""
    values = set()
    for rule in rules:
        if key in rule and rule[key]:
            values.update(rule[key])
    return values
