"""Unified configuration for the Altinn tools and server."""

import os
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI Configuration
AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT", "https://rndlabaidemoss0618689180.openai.azure.com/")
API_KEY = os.getenv("AZURE_API_KEY", "")
DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-2M-tps")
EMBEDDING_DEPLOYMENT_NAME = os.getenv("AZURE_EMBEDDING_DEPLOYMENT_NAME", "text-embedding-3-large")

# MCP Configuration
# LangWatch to be replaced with langfuse
# LangWatch Configuration
LANGWATCH_API_KEY = os.getenv("LANGWATCH_API_KEY", "")
LANGWATCH_PROJECT_ID = os.getenv("LANGWATCH_PROJECT_ID", "studio-assistant")
LANGWATCH_ENABLED = os.getenv("LANGWATCH_ENABLED", "false")
LANGWATCH_LABELS = [""]

# Langfuse Configuration
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "false").lower() == "true"
LANGFUSE_ENVIRONMENT = os.getenv("LANGFUSE_ENVIRONMENT", "production")

# LLM Configuration
LLM_CONFIG = {
    "API_VERSION": "2024-02-01",
    "CODE_GENERATION_TEMPERATURE": 0.2,
    "CODE_REVIEW_TEMPERATURE": 0.1,
    "MAX_TOKENS": 4000,
}

# Vector Store Configuration
VECTOR_STORE_CONFIG = {
    "API_VERSION": "2024-02-01",
    "APP_SIMILARITY_K": 10,
    "APP_LIB_SIMILARITY_K": 10,
    "SIMILARITY_THRESHOLD": 0.4,
    "MAX_EXAMPLES_IN_PROMPT": 5,
    "MAX_EXAMPLE_CHARS": 1000,
    "EMBEDDING_BATCH_SIZE": 20,
}

# Repository Configuration
def resolve_env_placeholder(value: str) -> str:
    """Resolve environment variable placeholders in the format ${env:VARIABLE_NAME}
    
    This handles two cases:
    1. ${env:ACTUAL_ENV_VAR_NAME} - looks up the environment variable
    2. ${env:actual_token_value} - extracts the token value directly (for MCP client config)
    """
    if isinstance(value, str) and value.startswith("${env:") and value.endswith("}"):
        content = value[6:-1]  # Extract content from ${env:CONTENT}
        
        # First try to get it as an environment variable
        env_value = os.getenv(content)
        if env_value:
            return env_value
        
        # If not found as env var, assume the content itself is the token value
        # This handles cases where MCP client passes ${env:actual_token_value}
        return content
    return value

# Get GITEA_API_KEY and resolve any environment variable placeholders
_raw_gitea_key = os.getenv("GITEA_API_KEY", "")
GITEA_API_KEY = resolve_env_placeholder(_raw_gitea_key)
GITEA_URL = os.getenv("GITEA_URL", "https://altinn.studio/repos/api/v1")
STUDIO_ASSISTANT_TEST_REPO = "https://altinn.studio/repos/nlunde/studio-assistant-test.git"
APP_LIB_REPO = "https://github.com/Altinn/app-lib-dotnet.git"

if GITEA_API_KEY and "altinn.studio" in STUDIO_ASSISTANT_TEST_REPO:
    repo_path = STUDIO_ASSISTANT_TEST_REPO.split("altinn.studio/")[1]
    STUDIO_ASSISTANT_TEST_REPO = f"https://{GITEA_API_KEY}@altinn.studio/{repo_path}"

# Directory Configuration
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
REPOSITORIES_DIR = os.path.join(DATA_DIR, "repositories")
LOGS_DIR = os.path.join(DATA_DIR, "logs")
OUTPUT_DIR = os.path.join(ROOT_DIR, "output")
STUDIO_APPS_DIR = os.path.join(ROOT_DIR, "studio-apps")
EXAMPLES_DIR = os.path.join(ROOT_DIR, "examples", "layout_expressions")

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(REPOSITORIES_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# App Fetching Configuration
APP_FETCHER_CONFIG = {
    "EMBEDDING_API_URL": "http://localhost:8000/appNames",
    "GITEA_URL": GITEA_URL,
    "DEFAULT_APP_LIST": ["krt-krt-3030a-1", "krt-krt-1009a-1", "krt-krt-1230a-1"],
    "NUM_APPS_TO_FETCH": 3,
    "API_TIMEOUT": 10,
    "RETRY_DELAY": 60,
}

# Output paths
STUDIO_ASSISTANT_TEST_REPO_DIR = os.path.join(REPOSITORIES_DIR, "studio-assistant-test")
APP_LIB_DIR = os.path.join(REPOSITORIES_DIR, "app-lib-dotnet")
STUDIO_ASSISTANT_TEST_DIR = os.path.join(OUTPUT_DIR, "studio-assistant-test")
APP_VECTOR_CACHE = os.path.join(CACHE_DIR, "app_vector_store")
APP_LIB_VECTOR_CACHE = os.path.join(CACHE_DIR, "app_lib_vector_store")
DEFAULT_OUTPUT_DIR_NAME = "generated"

# Layout expression specific configuration
LAYOUT_EXPRESSION_CONFIG = {
    "EXPRESSION_TYPES": ["hidden", "required", "readOnly", "value"],
    "DEFAULT_OUTPUT_DIR": DEFAULT_OUTPUT_DIR_NAME,
    "MAX_EXPRESSION_LENGTH": 500,
    "MAX_EXPRESSIONS_PER_REQUEST": 10,
    "MAX_DATA_BINDINGS": 50,
}

COMMON_PATTERNS = {
    "hidden": {
        "equals": ["equals", ["dataModel", "{field}"], "{value}"],
        "not_equals": ["notEquals", ["dataModel", "{field}"], "{value}"],
        "contains": ["contains", ["dataModel", "{field}"], "{value}"],
        "greater_than": ["greaterThan", ["dataModel", "{field}"], "{value}"],
        "less_than": ["lessThan", ["dataModel", "{field}"], "{value}"],
        "is_true": True,
        "is_false": False,
        "and_condition": ["and", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "or_condition": ["or", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "component_equals": ["equals", ["component", "{component_id}"], "{value}"],
        "component_not_equals": ["notEquals", ["component", "{component_id}"], "{value}"],
    },
    "required": {
        "equals": ["equals", ["dataModel", "{field}"], "{value}"],
        "not_equals": ["notEquals", ["dataModel", "{field}"], "{value}"],
        "not_empty": ["notEmpty", ["dataModel", "{field}"]],
        "is_true": True,
        "is_false": False,
        "and_condition": ["and", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "or_condition": ["or", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "component_equals": ["equals", ["component", "{component_id}"], "{value}"],
        "component_not_equals": ["notEquals", ["component", "{component_id}"], "{value}"],
    },
    "readOnly": {
        "equals": ["equals", ["dataModel", "{field}"], "{value}"],
        "not_equals": ["notEquals", ["dataModel", "{field}"], "{value}"],
        "is_true": True,
        "is_false": False,
        "and_condition": ["and", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "or_condition": ["or", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "component_equals": ["equals", ["component", "{component_id}"], "{value}"],
        "component_not_equals": ["notEquals", ["component", "{component_id}"], "{value}"],
    },
    "value": {
        "concat": ["concat", ["dataModel", "{field1}"], " ", ["dataModel", "{field2}"]],
        "substring": ["substring", ["dataModel", "{field}"], "{start}", "{length}"],
        "is_true": True,
        "is_false": False,
        "and_condition": ["and", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "or_condition": ["or", ["equals", ["dataModel", "{field1}"], "{value1}"], ["equals", ["dataModel", "{field2}"], "{value2}"]],
        "component_equals": ["equals", ["component", "{component_id}"], "{value}"],
        "component_not_equals": ["notEquals", ["component", "{component_id}"], "{value}"],
    },
}

LLM_PROMPTS = {
    # System message for code generation
    "CODE_GENERATION_SYSTEM_MESSAGE": """
    You are a C# expert specializing in Altinn Studio applications. Your task is to generate logic files for an Altinn application based on the user's request.

    IMPORTANT ABOUT FILE STRUCTURE:
    - DO NOT create specialized handler classes for each functionality
    - Use existing classes like DataProcessor.cs and add new methods there
    - DataProcessor.cs implements IDataProcessor interface
    - ValidationHandler.cs implements IValidationHandler interface
    - Follow patterns in examples rather than creating new files
    - Carefully analyze existing file structure and patterns before generating code
    - All logic files should be placed in the App/logic/ directory (note lowercase 'logic')
    - Do not create files in App/Logic/ (uppercase 'L')
    - Do not create nested App/App/ directories

    Your response should be a JSON array of file objects, each with:
    1. "path": Relative path within the app (e.g., "logic/Validation/MyValidator.cs")
    2. "content": Complete C# code content for the file
    """,
    
    # System message for code review
    "CODE_REVIEW_SYSTEM_MESSAGE": """
    You are a C# expert specializing in Altinn Studio applications. Your task is to review the generated code for quality, correctness, and adherence to Altinn conventions.
    
    Focus on:
    1. Proper namespaces and using statements
    2. Correct implementation of interfaces
    3. Proper error handling
    4. Consistent naming conventions
    5. Code organization and readability
    6. Potential bugs or edge cases
    7. Performance considerations
    
    If you find issues, provide an improved version of the code that addresses these issues.
    
    Your response should be in the following format:
    ```json
    {
        "review": {
            "issues": ["List of issues found"],
            "suggestions": ["List of suggestions for improvement"],
            "issues_found": true/false
        },
        "improved_code": "Complete improved code if issues were found, otherwise null"
    }
    ```
    """
    ,
    "COMPONENT_SELECTION_SYSTEM_MESSAGE": """
    You are in charge of selecting relevant UI components for an Altinn application based on the user's request.
    The context you have access to is a list of files. Each file has several UI components in it, and are grouped under filenames (e.g. "AccordianGroupPage.json").
    One component is one entry in the layouts field in each file. For example:
    {
        "id": "accordion-group",
        "type": "AccordionGroup",
        "children": [
          "accordion1",
          "accordion2"
        ]
    },
    Your job is to select the most relevant components for the user's request. 
    
    Focus on:
    1. Relevance to the user's request
    2. Component complexity (prefer simple components if otherwise specified)
    3. Component dependencies (prefer components with few dependencies)


    Your response should be in the following format:
    ```json
    {
        "components": [
            {
                "component_file_name": <component file name (e.g. "AccordianGroupPage.json")>,
                "component_id": <component id (e.g. "accordian1")>,
                "reason": <brief explanation of relevance>
            }
        ]
    }
    ```
    """
    ,
    "POLICY_VALIDATION_SYSTEM_MESSAGE": """
    You are an expert in Altinn Studio policy and authorization rules. 
    Your task is to compare the user query with the existing rules in the file. 
    Analyze each rule to determine if it matches the users query. 
    The rule is only a match if the roles match the user query, and there must be an identic match between user query and accesses the role is granted. 
    Return the user query, what rules that is an exact match, and inform of deviation between user query and existing rules. 
    All rules, either relevant or irrelevant, should be returned, with a comment on relevance.
    Important: Always return the entire rule content in your response, not just the rule number or ID. Include all details of the rule including role, resources, and actions.
    """
}

MODIFICATION_KEYWORDS = [
    "update", "modify", "change", "edit", "alter", "revise", "add to", "existing", "current", "already",
]

# Component selection configs
COMPONENT_SELECTION_CONFIG = {
    "MIN_RELEVANCE_SCORE": 3.0,
    "REPO_OWNER": "ttd",
    "REPO_NAME": "component-library",
    "LAYOUTS_PATH": "App/ui/ComponentLayouts/layouts",
}

