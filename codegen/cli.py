"""
Command-line interface for the Altinn Studio Code Generator.
"""

import argparse
import os
import sys
import time

from .pipeline.core import run_pipeline
from .core.utils import force_refresh_vector_stores

def main():
    """Main entry point for the CLI"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Altinn Studio Code Generator - Generate C#- and json- code for Altinn Studio applications"
    )
    parser.add_argument(
        "--refresh", "-r", 
        action="store_true", 
        help="Force refresh of vector stores"
    )
    parser.add_argument(
        "--prompt", "-p", 
        type=str, 
        help="User prompt for logic and generation"
    )
    parser.add_argument(
        "--verbose", "-v", 
        action="store_true", 
        help="Enable verbose output"
    )
    args = parser.parse_args()
    
    # Handle vector store refresh
    if args.refresh:
        force_refresh_vector_stores()
    
    # Use provided prompt or default test prompt
    user_prompt = args.prompt if args.prompt else "Write a validation for InnsenderEpost. Validate that Innsender Epost has a correct mail format"
    
    # Run the pipeline
    start_time = time.time()
    result = run_pipeline(user_prompt)
    
    # Print the result
    print("\n==== PIPELINE RESULT ====")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    print(f"Execution time: {result.get('elapsed_time', 'N/A')}")
    
    if result['status'] == 'success':
        print(f"Generated {len(result['files'])} files")
        
        # Print summary of generated files
        print("\nGenerated files summary:")
        for i, file_info in enumerate(result['files']):
            path = file_info['path']
            size = file_info.get('size', 'unknown')
            lines = file_info.get('lines', 'unknown')
            has_review = 'review' in file_info and file_info['review']
            
            print(f"{i+1}. {os.path.basename(path)}")
            print(f"   - Path: {path}")
            print(f"   - Size: {size} chars, {lines} lines")
            if has_review and file_info['review'].get('issues_found', False):
                print(f"   - Improved by code review")
    
    # Return success or error code
    return 0 if result['status'] == 'success' else 1

if __name__ == "__main__":
    sys.exit(main())
