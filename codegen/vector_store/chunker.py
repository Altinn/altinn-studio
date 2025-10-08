"""
Code chunking utilities for the Altinn Studio Code Generator.
"""

import os
import re
from typing import List, Dict, Any, Optional

def chunk_code_file(file_path: str, content: str) -> List[Dict[str, Any]]:
    """
    Chunk a code file into smaller pieces for embedding.
    
    Args:
        file_path: Path to the file
        content: Content of the file
        
    Returns:
        List of chunks with metadata
    """
    # Extract file extension
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    # Determine chunking strategy based on file type
    if ext in ['.cs', '.java', '.cpp', '.c', '.h', '.hpp']:
        return chunk_c_style_code(file_path, content)
    elif ext in ['.py']:
        return chunk_python_code(file_path, content)
    elif ext in ['.js', '.ts', '.jsx', '.tsx']:
        return chunk_javascript_code(file_path, content)
    else:
        # Default chunking for other file types
        return chunk_by_lines(file_path, content)

def chunk_c_style_code(file_path: str, content: str) -> List[Dict[str, Any]]:
    """
    Chunk C-style code (C#, Java, C++, etc.) into logical units.
    
    Args:
        file_path: Path to the file
        content: Content of the file
        
    Returns:
        List of chunks with metadata
    """
    chunks = []
    
    # Extract namespace/class/method definitions
    namespace_pattern = r'namespace\s+([^\s{]+)\s*{'
    class_pattern = r'(?:public|private|protected|internal)?\s*(?:static|abstract)?\s*class\s+([^\s:]+)'
    method_pattern = r'(?:public|private|protected|internal)?\s*(?:static|virtual|abstract|override)?\s*(?:[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*\('
    
    # Find namespaces
    namespace_matches = re.finditer(namespace_pattern, content)
    for namespace_match in namespace_matches:
        namespace_name = namespace_match.group(1)
        namespace_start = namespace_match.start()
        
        # Find the corresponding closing brace
        brace_count = 0
        namespace_end = namespace_start
        for i in range(namespace_start, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    namespace_end = i + 1
                    break
        
        namespace_content = content[namespace_start:namespace_end]
        
        # Add the namespace as a chunk
        chunks.append({
            'content': namespace_content,
            'metadata': {
                'file': file_path,
                'type': 'namespace',
                'name': namespace_name
            }
        })
        
        # Find classes within the namespace
        class_matches = re.finditer(class_pattern, namespace_content)
        for class_match in class_matches:
            class_name = class_match.group(1)
            class_start = namespace_start + class_match.start()
            
            # Find the corresponding closing brace
            brace_count = 0
            class_end = class_start
            for i in range(class_start, namespace_end):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        class_end = i + 1
                        break
            
            class_content = content[class_start:class_end]
            
            # Add the class as a chunk
            chunks.append({
                'content': class_content,
                'metadata': {
                    'file': file_path,
                    'type': 'class',
                    'name': f"{namespace_name}.{class_name}"
                }
            })
            
            # Find methods within the class
            method_matches = re.finditer(method_pattern, class_content)
            for method_match in method_matches:
                method_name = method_match.group(1)
                method_start = class_start + method_match.start()
                
                # Find the corresponding closing brace
                brace_count = 0
                method_end = method_start
                for i in range(method_start, class_end):
                    if content[i] == '{':
                        brace_count += 1
                    elif content[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            method_end = i + 1
                            break
                
                method_content = content[method_start:method_end]
                
                # Add the method as a chunk
                chunks.append({
                    'content': method_content,
                    'metadata': {
                        'file': file_path,
                        'type': 'method',
                        'name': f"{namespace_name}.{class_name}.{method_name}"
                    }
                })
    
    # If no chunks were found, fall back to chunking by lines
    if not chunks:
        return chunk_by_lines(file_path, content)
    
    return chunks

def chunk_python_code(file_path: str, content: str) -> List[Dict[str, Any]]:
    """
    Chunk Python code into logical units.
    
    Args:
        file_path: Path to the file
        content: Content of the file
        
    Returns:
        List of chunks with metadata
    """
    chunks = []
    
    # Extract class/function definitions
    class_pattern = r'class\s+([^\s(:]+)'
    function_pattern = r'def\s+([^\s(]+)'
    
    # Find classes
    class_matches = re.finditer(class_pattern, content)
    for class_match in class_matches:
        class_name = class_match.group(1)
        class_start = class_match.start()
        
        # Find the end of the class (next class or end of file)
        next_class = re.search(class_pattern, content[class_start + 1:])
        if next_class:
            class_end = class_start + 1 + next_class.start()
        else:
            class_end = len(content)
        
        class_content = content[class_start:class_end]
        
        # Add the class as a chunk
        chunks.append({
            'content': class_content,
            'metadata': {
                'file': file_path,
                'type': 'class',
                'name': class_name
            }
        })
        
        # Find functions within the class
        function_matches = re.finditer(function_pattern, class_content)
        for function_match in function_matches:
            function_name = function_match.group(1)
            function_start = class_start + function_match.start()
            
            # Find the end of the function (next function, next class, or end of file)
            next_function = re.search(function_pattern, content[function_start + 1:class_end])
            if next_function:
                function_end = function_start + 1 + next_function.start()
            else:
                function_end = class_end
            
            function_content = content[function_start:function_end]
            
            # Add the function as a chunk
            chunks.append({
                'content': function_content,
                'metadata': {
                    'file': file_path,
                    'type': 'function',
                    'name': f"{class_name}.{function_name}"
                }
            })
    
    # Find top-level functions
    function_matches = re.finditer(function_pattern, content)
    for function_match in function_matches:
        function_name = function_match.group(1)
        function_start = function_match.start()
        
        # Check if this function is within a class (already processed)
        is_in_class = False
        for chunk in chunks:
            if chunk['metadata']['type'] == 'class' and function_start >= chunk['metadata'].get('start', 0) and function_start < chunk['metadata'].get('end', len(content)):
                is_in_class = True
                break
        
        if is_in_class:
            continue
        
        # Find the end of the function (next function, next class, or end of file)
        next_function = re.search(function_pattern, content[function_start + 1:])
        next_class = re.search(class_pattern, content[function_start + 1:])
        
        if next_function and (not next_class or next_function.start() < next_class.start()):
            function_end = function_start + 1 + next_function.start()
        elif next_class:
            function_end = function_start + 1 + next_class.start()
        else:
            function_end = len(content)
        
        function_content = content[function_start:function_end]
        
        # Add the function as a chunk
        chunks.append({
            'content': function_content,
            'metadata': {
                'file': file_path,
                'type': 'function',
                'name': function_name
            }
        })
    
    # If no chunks were found, fall back to chunking by lines
    if not chunks:
        return chunk_by_lines(file_path, content)
    
    return chunks

def chunk_javascript_code(file_path: str, content: str) -> List[Dict[str, Any]]:
    """
    Chunk JavaScript/TypeScript code into logical units.
    
    Args:
        file_path: Path to the file
        content: Content of the file
        
    Returns:
        List of chunks with metadata
    """
    chunks = []
    
    # Extract class/function definitions
    class_pattern = r'class\s+([^\s{]+)'
    function_pattern = r'(?:function|const|let|var)\s+([^\s=({]+)\s*[=]?\s*(?:\([^)]*\))?\s*[=]?\s*(?:=>)?\s*{'
    
    # Find classes
    class_matches = re.finditer(class_pattern, content)
    for class_match in class_matches:
        class_name = class_match.group(1)
        class_start = class_match.start()
        
        # Find the corresponding closing brace
        brace_count = 0
        class_end = class_start
        for i in range(class_start, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    class_end = i + 1
                    break
        
        class_content = content[class_start:class_end]
        
        # Add the class as a chunk
        chunks.append({
            'content': class_content,
            'metadata': {
                'file': file_path,
                'type': 'class',
                'name': class_name
            }
        })
    
    # Find functions
    function_matches = re.finditer(function_pattern, content)
    for function_match in function_matches:
        function_name = function_match.group(1)
        function_start = function_match.start()
        
        # Find the corresponding closing brace
        brace_count = 0
        function_end = function_start
        for i in range(function_start, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    function_end = i + 1
                    break
        
        function_content = content[function_start:function_end]
        
        # Add the function as a chunk
        chunks.append({
            'content': function_content,
            'metadata': {
                'file': file_path,
                'type': 'function',
                'name': function_name
            }
        })
    
    # If no chunks were found, fall back to chunking by lines
    if not chunks:
        return chunk_by_lines(file_path, content)
    
    return chunks

def chunk_by_lines(file_path: str, content: str, chunk_size: int = 50) -> List[Dict[str, Any]]:
    """
    Chunk a file by lines.
    
    Args:
        file_path: Path to the file
        content: Content of the file
        chunk_size: Number of lines per chunk
        
    Returns:
        List of chunks with metadata
    """
    chunks = []
    lines = content.split('\n')
    
    for i in range(0, len(lines), chunk_size):
        chunk_lines = lines[i:i + chunk_size]
        chunk_content = '\n'.join(chunk_lines)
        
        chunks.append({
            'content': chunk_content,
            'metadata': {
                'file': file_path,
                'type': 'lines',
                'start_line': i,
                'end_line': min(i + chunk_size, len(lines))
            }
        })
    
    return chunks
