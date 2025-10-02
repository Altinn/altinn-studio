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
    Tool with all relevant context for policy generation.
    For all use in policy.xml, or any changes in the authorization or access control of users.
    Generate standard for the policy code for a user query using the Altinn Studio pipeline.
    Find the relevant role based on user query.
    Find the relevant authorization based on user query.
    Remove authorization from role based on prompt.

    Returns:
        A dictionary containing all relevant information for policy generation, including roles, access controls, and markdown with steps to generate the policy code
""",
    title="Policy Tool",
    annotations=ToolAnnotations(
        title="Policy Tool",
        readOnlyHint=True,
        idempotentHint=True
    )
)
def policy_tool() -> dict:
    """Provides documentation on implementing authorization policies in Altinn applications.
    
    Returns:
        A dictionary containing all relevant information for policy generation, including roles, access controls, and markdown with steps to generate the policy code
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

