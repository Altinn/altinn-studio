import json
import defusedxml.ElementTree as ET
from xml.etree.ElementTree import Element  # For type hints only
from typing import Dict, Any, List, Optional
from mcp.types import ToolAnnotations

from server.tools import register_tool
from server.tools.policy_tool.static import all_roles

@register_tool(
    name="policy_summarization_tool",
    description="""
Parses policy.xml and creates a readable summary of authorization rules.

## Purpose
Convert XACML policy XML into a structured summary showing who can do what.

## Required Parameters
- `xml_content`: The complete policy.xml content as a string

## Returns
- `status`: "success" | "error"
- `rules`: List of parsed rules with role, resource, and action information
- `message`: Summary or error description

## Output Structure
Each rule contains:
- `type`: "info" | "warning" | "error"
- `message`: Human-readable rule description
- `role`: List of roles/subjects that can perform actions
- `resource`: List of resources the rule applies to
- `action`: List of allowed actions (read, write, instantiate, etc.)

## When to Use
✅ To understand existing policy.xml authorization rules
✅ BEFORE calling `policy_validation_tool` (required prerequisite)
✅ After modifying policy.xml to verify changes
✅ To audit who has access to what in the application

## When NOT to Use
❌ To learn how to write policy.xml (use `policy_tool` instead)
❌ To validate rules against requirements (use `policy_validation_tool` AFTER this tool)

## Common Errors
- "No XML content provided" → Pass the xml_content parameter
- "XML parsing error" → The XML is malformed, check syntax
- "No rules found" → The policy.xml doesn't contain any Rule elements

## Usage Flow
```
1. policy_summarization_tool(xml_content) → Get rules summary
2. [Optional] policy_validation_tool(query, policy_rules) → Validate against requirements
```
""",
    title="Policy Summarization Tool",
    annotations=ToolAnnotations(
        title="Policy Summarization Tool",
        readOnlyHint=True
    )
)
def policy_summarization_tool(user_goal: str, xml_content: str) -> dict:
    """
    Creates a readable summary of a policy file.
    A comprehensive explanation of the authorization rules in the policy file is generated.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
        xml_content: The XML content of the policy.xml file as a string
    
    Returns:
        A dictionary containing the policy summary.
        The summary contains a readable list of all authorization rules in the policy file.
    """

    # Check if XML content is provided
    if not xml_content:
        return {
            "status": "error",
            "error_code": "MISSING_INPUT",
            "message": "MISSING_PARAMETER: No xml_content provided. You must pass the complete policy.xml content as a string.",
            "hint": "Read the policy.xml file and pass its content as the xml_content parameter.",
            "example": 'policy_summarization_tool(xml_content="<Policy xmlns=\\"urn:oasis:names:tc:xacml:3.0:core:schema:wd-17\\" ...>...</Policy>")',
            "retry_allowed": False
        }
    
    try:
        # Parse the XML content
        summary_results = summarize_policy_content(xml_content)

        # Check if summary_results has a status key and if it's an error
        if isinstance(summary_results, dict) and "status" in summary_results and summary_results["status"] == "error":
            return summary_results
        
        return {"status": "success", "message": "Policy file summarized successfully", "rules": summary_results}
    except Exception as e:
        return {"status": "error", "message": f"Error summarizing policy file: {str(e)}"}


def summarize_policy_content(xml_content: str) -> List[Dict[str, Any]]:
    """
    Summarizes a policy XML content by iterating through its elements and checking for policy rules.
    
    Security Note: This function uses defusedxml to safely parse potentially untrusted XML input,
    protecting against XXE (XML External Entity) and billion laughs attacks.
    
    Args:
        xml_content: The XML content of the policy file as a string (potentially untrusted).
        
    Returns:
        Dictionary containing policy metadata and rule summaries.
    """

    results = []
    
    try:
        # Parse the XML content
        root = ET.fromstring(xml_content)
        
        # Check for basic structure
        if not root.tag.endswith("Policy"):
            results.append({
                "type": "error",
                "message": f"Root element should be 'Policy', found '{root.tag}' "
            })
        
        # Check for required attributes
        required_attrs = ["PolicyId", "Version"]
        for attr in required_attrs:
            if attr not in root.attrib:
                results.append({
                    "type": "error",
                    "message": f"Missing required attribute '{attr}' in Policy element"
                })
        
        # Check for rules
        rules = root.findall(".//xacml:Rule", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
        if not rules:
            results.append({
                "type": "warning",
                "message": "WARNING: No rules found in policy file"
            })
        
    
        # Summarize each rule
        for i, rule in enumerate(rules):
            rule_results = summarize_rule(rule, i+1)
            results.extend(rule_results)
            
        return results
    
    except ET.ParseError as e:
        return {"status": "error", "message": f"XML parsing error: {str(e)}"}

def summarize_rule(rule: Element, rule_index: int) -> List[Dict[str, Any]]:
    """
    Summarizes a single rule element in the policy file.
    Decomposes rule into role (subject-category:access-subject), 
    resource (attribute-category:resource), and action (attribute-category:action).
    
    Args:
        rule: The rule element to validate.
        rule_index: The index of the rule (for reporting purposes).
        
    Returns:
        String representation of validation results for this rule.
    """
    results = []

    role = []
    resource = []
    action = []
    
    # Check for required attributes
    if "RuleId" not in rule.attrib:
        results.append({
            "type": "error",
            "message": f"Rule #{rule_index} is missing required 'RuleId' attribute"
        })
    
    # Check for Effect attribute
    if "Effect" not in rule.attrib:
        results.append({
            "type": "error",
            "message": f"Rule #{rule_index} is missing required 'Effect' attribute"
        })
    else:
        effect = rule.attrib["Effect"]
        if effect not in ["Permit", "Deny"]:
            results.append({
                "type": "error",
                "message": f"Rule #{rule_index} has invalid Effect value: '{effect}'. Must be 'Permit' or 'Deny'"
            })
    
    #Check for description
    description = rule.find("xacml:Description", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
    description_text = description.text if description is not None else "No description"
    
    
    # Check for target element
    target = rule.find("xacml:Target", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
    if target is None:
        results.append({
            "type": "warning",
            "message": f"WARNING: Rule #{rule_index} has no Target element"
        })
    else:
        # Decompose rule into role, resource, and action components
        any_of_elements = target.findall("xacml:AnyOf", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
        
        for any_of in any_of_elements:
            all_of_elements = any_of.findall("xacml:AllOf", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
            
            for all_of in all_of_elements:
                match_elements = all_of.findall("xacml:Match", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
                
                for match in match_elements:
                    # Get attribute designator to determine if this is role, resource, or action
                    attr_designator = match.find("xacml:AttributeDesignator", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
                    
                    if attr_designator is not None:
                        category = attr_designator.get("Category")
                        attr_id = attr_designator.get("AttributeId")
                        
                        # Get attribute value
                        attr_value_elem = match.find("xacml:AttributeValue", {"xacml": "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"})
                        if attr_value_elem is not None and attr_value_elem.text:
                            attr_value = attr_value_elem.text.strip()
                            
                            # Categorize based on category attribute
                            if category == "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject":
                                if attr_id == "urn:altinn:rolecode":
                                    role_info = find_role(attr_value)
                                elif attr_id == "urn:altinn:org":
                                    role_info = "Tjenesteeier (Service Owner)"
                                role.append({
                                    "attribute_id": attr_id,
                                    "value": attr_value,
                                    "role": role_info
                                })
                            elif category == "urn:oasis:names:tc:xacml:3.0:attribute-category:resource":
                                resource.append({
                                    "attribute_id": attr_id,
                                    "value": attr_value
                                })
                            elif category == "urn:oasis:names:tc:xacml:3.0:attribute-category:action":
                                action.append({
                                    "attribute_id": attr_id,
                                    "value": attr_value
                                })
        
        # Add decomposition results
        if not role:
            results.append({
                "type": "warning",
                "message": f"WARNING: Rule #{rule_index} has no role (subject-category:access-subject) defined"
            })
        
        if not resource:
            results.append({
                "type": "warning",
                "message": f"WARNING: Rule #{rule_index} has no resource (attribute-category:resource) defined"
            })
        
        if not action:
            results.append({
                "type": "warning",
                "message": f"WARNING: Rule #{rule_index} has no action (attribute-category:action) defined"
            })
        
    results.append({
        "type": "info",
        "message": f"Rule #{rule_index}: {description_text}",
        "role": role,
        "resource": resource,
        "action": action
    })

    return results


def find_role(role_definition_code: str) -> str: 
    if not role_definition_code:
        return "Unknown role"
    
    # Convert input to lowercase for case-insensitive comparison
    role_code_lower = role_definition_code.lower()
    
    for role in all_roles:
        # Compare both in lowercase for case-insensitive matching
        if role["RoleDefinitionCode"].lower() == role_code_lower:
            return f"{role['RoleName']} ({role['RoleDefinitionCode']}) {role['RoleDescription']}"
    return "Unknown role"



if __name__ == "__main__":
    # For testing purposes
    with open("/Users/johanne.norland/Documents/intro-prosjekt/konkursbo-faktiskledelseogeier/App/config/authorization/policy.xml", 'r') as f:
        xml_content = f.read()
    result = policy_summarization_tool("test", xml_content)
    print(result)