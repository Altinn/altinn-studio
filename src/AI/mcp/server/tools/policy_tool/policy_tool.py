from server.tools import register_tool
import requests
from typing import Dict, Any, Optional
from server.config import GITEA_API_KEY
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
import json
import os
from mcp.types import ToolAnnotations


ROLE_API_URL = "https://www.altinn.no/api/metadata/roledefinitions"

@register_tool(
    name="policy_tool",
    description="""
Returns static documentation on authorization policies and access control in Altinn applications.

## Purpose
Understand how to create and configure policy.xml for authorization rules.

## No Parameters Required
Returns comprehensive static documentation - call ONCE per session.

## Documentation Covers
- XACML policy structure and syntax
- Role definitions and role codes
- Resource and action definitions
- Policy rule patterns (Permit/Deny)
- Common authorization scenarios

## File Location
Policy file is stored at: `App/config/authorization/policy.xml`

## When to Use
✅ To understand policy.xml structure before creating rules
✅ When implementing authorization for the first time
✅ To learn about available roles and actions
✅ Before using `policy_summarization_tool` or `policy_validation_tool`

## When NOT to Use
❌ To summarize existing policy (use `policy_summarization_tool` instead)
❌ To validate policy rules (use `policy_validation_tool` instead)
❌ Multiple times in same session (returns identical static content)

## Related Tools
- `policy_summarization_tool`: Parse and summarize existing policy.xml
- `policy_validation_tool`: Validate rules against requirements (requires summarization first)

## Policy Workflow
```
1. policy_tool() → Understand policy concepts
2. Create/modify policy.xml
3. policy_summarization_tool(xml_content) → Get readable summary
4. policy_validation_tool(query, policy_rules) → Validate against requirements
```
""",
    title="Policy Tool",
    annotations=ToolAnnotations(
        title="Policy Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def policy_tool(user_goal: str) -> dict:
    """Provides documentation on implementing authorization policies in Altinn applications.
    
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
    
    Returns:
        A dictionary containing the markdown documentation for Altinn Studio policies.
    """

    # Using all_roles imported from static.py instead of fetching from API
    # all_roles = fetch_api(ROLE_API_URL) # This part needs to be updated to fit into the new system eventually.
    # TODO: Track this task in the issue tracker to ensure it is addressed.
    # -Gjøre om til både tilgangspakker og roller, samt organisasjoner.
    # -Oppdatere md om de tre ulike typene access-control: org, rolecode, accesspackage
    # -Hente definisjoner av rollene i de gitte Apiene:
    # https://www.altinn.no/api/metadata/roledefinitions
    # https://platform.tt02.altinn.no/accessmanagement/api/v1/meta/info/accesspackages/export
        
    # choose the role that best matches the user query
    #best_role = find_best_role(all_roles, query)

    # find all the rights

    # Load the markdown documentation from file
    try:
        doc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tools", "policy_tool", "policy_context.md")
        with open(doc_path, 'r') as f:
            markdown_content = f.read()
    except FileNotFoundError:
        return {"status": "error", "message": f"Documentation file not found. Please ensure the policy_context.md is in {doc_path}."}

    return {"status": "success", "message":markdown_content}

def fetch_api(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "error", "message": f"API request failed: {str(e)}"}

