"""
LLM helpers module for the Altinn Studio Code Generator.
Contains functions for interacting with LLMs and parsing responses.
"""

import os
import re
import json
import traceback
from typing import Dict, List, Any, Optional

# Import LangWatch for monitoring
import langwatch
from langwatch.types import RAGChunk

# Import LLM
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser

# Import utilities
from server.config import (
    AZURE_ENDPOINT,
    API_KEY,
    DEPLOYMENT_NAME,
    LLM_PROMPTS,
    LLM_CONFIG,
    LANGWATCH_API_KEY,
    LANGWATCH_PROJECT_ID,
    LANGWATCH_ENABLED,
)

# Initialize LangWatch tracer if enabled
langwatch_tracer = None
if LANGWATCH_ENABLED and LANGWATCH_API_KEY:
    try:
        # Set the API key for LangWatch
        langwatch.api_key = LANGWATCH_API_KEY
        # Create a simple wrapper for compatibility with existing code
        class SimpleTracer:
            def span(self, name, metadata=None):
                # Ignore metadata as it's not supported in the current LangWatch version
                return langwatch.span(type="llm", name=name)
            
            def wrap_llm(self, llm, name=None):
                # For LangChain integration, we'll just return the original LLM
                # since we're using direct spans for tracing instead
                return llm
        
        langwatch_tracer = SimpleTracer()
        print("LangWatch monitoring enabled")
    except Exception as e:
        print(f"Error initializing LangWatch: {e}")
        langwatch_tracer = None
else:
    print("LangWatch monitoring disabled")

# Initialize Azure OpenAI LLMs with different temperature settings
# LLM for code generation - slightly higher temperature for creativity
generation_llm = AzureChatOpenAI(
    azure_endpoint=AZURE_ENDPOINT,
    api_key=API_KEY,
    api_version=LLM_CONFIG["API_VERSION"],
    deployment_name=DEPLOYMENT_NAME,
    # temperature=LLM_CONFIG["CODE_GENERATION_TEMPERATURE"],
    max_tokens=LLM_CONFIG["MAX_TOKENS"]
)

# LLM for code review - lower temperature for more deterministic reviews
review_llm = AzureChatOpenAI(
    azure_endpoint=AZURE_ENDPOINT,
    api_key=API_KEY,
    api_version=LLM_CONFIG["API_VERSION"],
    deployment_name=DEPLOYMENT_NAME,
    # temperature=LLM_CONFIG["CODE_REVIEW_TEMPERATURE"],
    max_tokens=LLM_CONFIG["MAX_TOKENS"]
)

# Wrap LLMs with LangWatch tracers if enabled
if langwatch_tracer:
    generation_llm = langwatch_tracer.wrap_llm(generation_llm, name="code_generation")
    review_llm = langwatch_tracer.wrap_llm(review_llm, name="code_review")

def generate_code(user_prompt: str, examples_text: str) -> str:
    """Generate code using the LLM based on user prompt and examples"""
    # Get system message from config
    system_message = LLM_PROMPTS["CODE_GENERATION_SYSTEM_MESSAGE"]
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=system_message),
        HumanMessage(content=f"""
        Generate C# logic files for an Altinn application based on this request:
        
        USER REQUEST: {user_prompt}
        
        Here are similar examples from other Altinn applications to guide you:
        {examples_text}
        
        Return your response as a JSON array of file objects.
        """)
    ])
    
    # Generate logic files
    print("Sending request to LLM for code generation...")
    
    # Create the chain
    chain = prompt | generation_llm | StrOutputParser()
    
    # Execute with LangWatch tracing if enabled
    if langwatch_tracer:
        with langwatch_tracer.span("generate_code"):
            response = chain.invoke({})
    else:
        response = chain.invoke({})
    # Additional LangWatch tracing for the complete operation
    with langwatch.span(type="llm", name="code_generation_complete") as span:
        if span:
            # Count examples by type
            app_examples_count = examples_text.count("EXAMPLE")
            app_lib_examples_count = examples_text.count("APP-LIB EXAMPLE")
            total_examples = app_examples_count + app_lib_examples_count
            
            # Extract file count from response
            file_count = response.count("namespace Altinn.App")
            
            # Create a detailed input summary
            input_summary = f"User prompt: {user_prompt}\n\n"
            input_summary += f"Context: Using {total_examples} examples ({app_examples_count} app examples, {app_lib_examples_count} app-lib examples)\n"
            
            # Create a detailed output summary
            output_summary = f"Generated {len(response)} characters of code\n"
            output_summary += f"Estimated file count: {file_count}\n"
            output_summary += f"Generation temperature: {LLM_CONFIG['CODE_GENERATION_TEMPERATURE']}\n"
            
            # Add a snippet of the generated code (first 500 chars)
            if len(response) > 0:
                output_summary += "\nGenerated code snippet:\n"
                output_summary += response[:500] + ("..." if len(response) > 500 else "")
            
            span.update(input=input_summary, output=output_summary)
        
    print("Received response from LLM")
    
    return response

def extract_code_from_response(response: str) -> List[Dict[str, Any]]:
    """Extract code file objects from the LLM response"""
    try:
        # Try to extract JSON from the response if it's wrapped in markdown code blocks
        json_match = re.search(r'```(?:json)?\s*\n([\s\S]*?)\n```', response)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            json_str = response.strip()
        
        # Handle incomplete JSON by trying to fix common issues
        if json_str.endswith('...'):
            print("Warning: JSON response appears to be truncated")
            # Try to complete the JSON if it's a simple array truncation
            if json_str.startswith('[') and not json_str.endswith(']'):
                json_str += "]"
        
        # Try to parse the JSON
        generated_files = json.loads(json_str)
        
        # Validate the response format
        if not isinstance(generated_files, list):
            raise ValueError("Response is not a list")
        
        valid_files = []
        for file in generated_files:
            if isinstance(file, dict):
                # Create a normalized file object
                normalized_file = {}
                
                # Handle fileName/fileContent keys
                if "fileName" in file and "fileContent" in file:
                    normalized_file["path"] = file["fileName"]
                    normalized_file["content"] = file["fileContent"]
                    valid_files.append(normalized_file)
                # Handle path/content keys
                elif "path" in file and "content" in file:
                    valid_files.append(file)
                else:
                    print(f"Warning: Skipping invalid file object: {file}")
        
        if not valid_files:
            raise ValueError("No valid file objects found")
        
        print(f"Successfully parsed {len(valid_files)} file objects")
        for i, file in enumerate(valid_files):
            print(f"  - File {i+1}: {file['path']} ({len(file['content'])} chars)")
        
        return valid_files
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse JSON response: {e}")
        print(f"Response: {response[:500]}...")
        
        # As a fallback, try to manually extract file information using regex
        try:
            print("Attempting to extract file information using regex...")
            files = []
            
            # Look for path and content patterns
            path_matches = re.findall(r'"path"\s*:\s*"([^"]+)"', response)
            content_blocks = re.findall(r'"content"\s*:\s*"((?:\\"|[^"])*)"', response)
            
            # If we found paths and contents, try to pair them
            if path_matches and content_blocks and len(path_matches) == len(content_blocks):
                for i in range(len(path_matches)):
                    # Unescape the content
                    content = content_blocks[i].replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
                    files.append({
                        "path": path_matches[i],
                        "content": content
                    })
                
                if files:
                    print(f"Successfully extracted {len(files)} files using regex")
                    return files
            
            # If regex extraction failed, try one more approach for single file responses
            if "ValidationHandler.cs" in response:
                # Extract the path
                path_match = re.search(r'path["\s:]+([^"\s,]+)', response)
                path = path_match.group(1) if path_match else "logic/ValidationHandler.cs"
                
                # Extract the content - look for a code block
                content_match = re.search(r'using System[^`]*?namespace.*?}[\s\n]*}', response, re.DOTALL)
                if content_match:
                    content = content_match.group(0)
                    files.append({
                        "path": path,
                        "content": content
                    })
                    print(f"Extracted ValidationHandler.cs content")
                    return files
        except Exception as regex_error:
            print(f"Regex extraction failed: {regex_error}")
        
        return []
    except ValueError as e:
        print(f"Error: Invalid response format: {e}")
        return []
    except Exception as e:
        print(f"Error extracting code: {e}")
        traceback.print_exc()
        return []

def review_code_with_llm(file_path: str, content: str) -> Dict[str, Any]:
    """Review code with the LLM and return review results"""
    try:
        # Get system message from config
        system_message = LLM_PROMPTS["CODE_REVIEW_SYSTEM_MESSAGE"]
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_message),
            HumanMessage(content=f"""
            Review this C# code for an Altinn application:
            
            File path: {file_path}
            
            ```csharp
            {content}
            ```
            
            Provide your review and suggest improvements if needed.
            """)
        ])
        
        # Generate review
        print(f"  Generating review...")
        
        # Create the chain
        chain = prompt | review_llm | StrOutputParser()
        
        # Execute with LangWatch tracing if enabled
        if langwatch_tracer:
            with langwatch_tracer.span("review_code"):
                review = chain.invoke({})
        else:
            review = chain.invoke({})
            
        # Additional LangWatch tracing for the complete review operation
        with langwatch.span(type="llm", name="code_review_complete") as span:
            if span:
                # Extract information from the file path and content
                file_name = os.path.basename(file_path)
                file_extension = os.path.splitext(file_name)[1]
                line_count = content.count('\n') + 1
                
                # Check if issues were found
                issues_found = "issue" in review.lower() or "improve" in review.lower() or "suggest" in review.lower()
                
                # Create a detailed input summary
                input_summary = f"Reviewing file: {file_path}\n"
                input_summary += f"File size: {len(content)} bytes, {line_count} lines\n"
                input_summary += f"File type: {file_extension}\n\n"
                
                # Add a snippet of the code being reviewed (first 300 chars)
                input_summary += "Code snippet:\n"
                input_summary += content[:300] + ("..." if len(content) > 300 else "")
                
                # Create a detailed output summary
                output_summary = f"Review completed: {len(review)} characters\n"
                output_summary += f"Issues found: {'Yes' if issues_found else 'No'}\n"
                # output_summary += f"Review temperature: {LLM_CONFIG['CODE_REVIEW_TEMPERATURE']}\n"
                
                # Add a snippet of the review (first 300 chars)
                if len(review) > 0:
                    output_summary += "\nReview snippet:\n"
                    output_summary += review[:300] + ("..." if len(review) > 300 else "")
                
                span.update(input=input_summary, output=output_summary)
        
        # Check if the review suggests improvements
        issues_found = "issue" in review.lower() or "improve" in review.lower() or "suggest" in review.lower()
        
        # Extract improved code if available
        improved_content = None
        diff_lines = []
        
        if issues_found:
            # Look for code blocks in the review
            code_blocks = re.findall(r"```(?:csharp|cs)?\n(.*?)```", review, re.DOTALL)
            if code_blocks:
                improved_content = code_blocks[-1]  # Use the last code block
                
                # Generate diff lines to show what changed
                diff_lines = []
                for i, (old_line, new_line) in enumerate(zip(content.split('\n'), improved_content.split('\n'))):
                    if old_line != new_line and len(diff_lines) < 3:
                        diff_lines.append(f"    Line {i+1}: '{old_line[:30]}...' → '{new_line[:30]}...'")
        
        # Print review summary
        print(f"  Review completed:")
        if issues_found:
            # Extract the first paragraph of the review as a summary
            summary = review.split('\n\n')[0] if '\n\n' in review else review.split('\n')[0]
            print(f"  - Issues found: {summary[:100]}...")
            
            if improved_content:
                print(f"  - Improvements suggested")
        else:
            print(f"  - No issues found. Code looks good!")
        
        return {
            "review": {
                "content": review,
                "issues_found": issues_found
            },
            "improved_content": improved_content,
            "diff_lines": diff_lines
        }
    except Exception as e:
        print(f"  Error in code review: {e}")
        traceback.print_exc()
        
        return {
            "review": {
                "content": f"Error during review: {str(e)}",
                "issues_found": False
            },
            "improved_content": None,
            "diff_lines": []
        }
