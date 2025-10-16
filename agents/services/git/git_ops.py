"""Git operations with safety caps and preview"""
import subprocess
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

class CapsExceededError(Exception):
    pass

def enforce_caps(patch: dict, limits: dict):
    """Count files and lines, raise if over caps"""
    files = patch.get("files", [])
    diff_content = patch.get("diff", "")

    if len(files) > limits.get("max_files", 5):
        raise CapsExceededError(f"Patch affects {len(files)} files, limit is {limits['max_files']}")

    # Count added/modified lines
    line_count = len([line for line in diff_content.split('\n') if line.startswith('+') and not line.startswith('+++')])
    if line_count > limits.get("max_lines", 400):
        raise CapsExceededError(f"Patch adds {line_count} lines, limit is {limits['max_lines']}")

def preview(patch: dict) -> dict:
    """Return files touched and short diff snippet"""
    files = patch.get("files", [])
    changes = patch.get("changes", [])
    diff = patch.get("diff", "")  # Old format compatibility

    # If no diff, generate preview from changes
    if not diff and changes:
        preview_lines = []
        for change in changes[:5]:  # Show first 5 changes
            op = change.get('operation', 'unknown')
            file = change.get('file', 'unknown')
            preview_lines.append(f"[{op}] {file}")
        preview_diff = '\n'.join(preview_lines)
        if len(changes) > 5:
            preview_diff += f"\n... ({len(changes) - 5} more changes)"
    else:
        # Truncate diff for preview (old format)
        diff_lines = diff.split('\n')
        preview_diff = '\n'.join(diff_lines[:10])
        if len(diff_lines) > 10:
            preview_diff += f"\n... ({len(diff_lines) - 10} more lines)"

    return {
        "files": files,
        "diff_preview": preview_diff,
        "file_count": len(files)
    }

def apply(patch: dict, repo_path: str = None):
    """Write files from patch to disk in the target repository"""
    changes = patch.get("changes", [])
    files = patch.get("files", [])

    print(f"Applying patch to {len(files)} files: {files}")

    # Check if changes have already been applied
    if patch.get("already_applied", False):
        print("Changes have already been applied to disk, skipping file operations")
        return

    # Reset to HEAD to ensure clean state before applying changes
    if repo_path:
        try:
            import subprocess
            result = subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=repo_path, capture_output=True, text=True, check=True)
            print("Reset repository to HEAD before applying changes")
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to reset to HEAD: {e}")

    for i, change in enumerate(changes):        
        # Make file path relative to the target repository
        file_path = Path(repo_path) / change["file"] if repo_path else Path(change["file"])
        operation = change["operation"]
        content = change.get("content", "")
        old_value = change.get("old_value")
        new_value = change.get("new_value")

        try:
            if operation == "create":
                # Create new file
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Created: {file_path}")
                        
            elif operation == "insert_json_property":
                # Generic: Insert a property into a JSON object at a specific path
                if not file_path.exists():
                    print(f"Warning: File does not exist: {file_path}")
                    continue
                
                path = change.get("path", [])  # e.g., ["properties"] or ["data", "layout"]
                key = change.get("key")
                value = change.get("value")
                
                if not key:
                    print(f"Warning: Missing 'key' for insert_json_property in {file_path}")
                    continue
                
                try:
                    import json as json_module
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json_module.load(f)
                    
                    # Navigate to the target object
                    target = data
                    for p in path:
                        if p not in target:
                            target[p] = {}
                        target = target[p]
                    
                    # Special case: if target is a list and we're trying to set a property on it,
                    # this is likely a mistake - convert to array insertion
                    if isinstance(target, list) and key in ['layout', 'resources', 'data']:
                        print(f"WARNING: Attempting to set property '{key}' on a list. Converting to array insertion.")
                        # Convert this to an insert_json_array_item operation
                        if isinstance(value, list):
                            # If value is a list, extend the target array
                            target.extend(value)
                            print(f"  Extended array at path {path} with {len(value)} items")
                        else:
                            # If value is a single item, append it
                            target.append(value)
                            print(f"  Appended item to array at path {path}")
                    else:
                        # Normal property insertion
                        target[key] = value
                        print(f"  Inserted JSON property '{key}' at path {path}")
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json_module.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"Modified: {file_path}")
                
                except Exception as e:
                    print(f"Error inserting JSON property in {file_path}: {e}")
            
            elif operation == "insert_json_array_item":
                # Generic: Insert an item into a JSON array at a specific path and index
                if not file_path.exists():
                    print(f"Warning: File does not exist: {file_path}")
                    continue
                
                path = change.get("path", [])  # e.g., ["data", "layout"] or ["resources"]
                item = change.get("item")
                insert_after_index = change.get("insert_after_index")  # Optional
                insert_after_id = change.get("insert_after_id")  # Optional: find by ID
                
                if not item:
                    print(f"Warning: Missing 'item' for insert_json_array_item in {file_path}")
                    continue
                
                try:
                    import json as json_module
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json_module.load(f)
                    
                    # Navigate to the target array
                    target = data
                    for p in path:
                        target = target[p]
                    
                    if not isinstance(target, list):
                        print(f"Warning: Path {path} does not point to an array in {file_path}")
                        continue
                    
                    # Determine insertion index
                    insert_index = len(target)  # Default: append
                    
                    if insert_after_index is not None:
                        insert_index = insert_after_index + 1
                    elif insert_after_id:
                        for i, existing_item in enumerate(target):
                            if isinstance(existing_item, dict) and existing_item.get('id') == insert_after_id:
                                insert_index = i + 1
                                break
                    
                    # Insert the item
                    target.insert(insert_index, item)
                    item_id = item.get('id', 'unknown') if isinstance(item, dict) else 'item'
                    print(f"  Inserted array item '{item_id}' at index {insert_index}")
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json_module.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"Modified: {file_path}")
                
                except Exception as e:
                    print(f"Error inserting JSON array item in {file_path}: {e}")
            
            elif operation == "insert_text_at_pattern":
                # Generic: Insert text at a specific pattern match (for C#, XSD, etc.)
                if not file_path.exists():
                    print(f"Warning: File does not exist: {file_path}")
                    continue
                
                pattern = change.get("pattern")  # Regex pattern to find
                text = change.get("text")  # Text to insert
                find_last = change.get("find_last", False)  # Find last occurrence?
                
                if not pattern or text is None:
                    print(f"Warning: Missing 'pattern' or 'text' for insert_text_at_pattern in {file_path}")
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find pattern matches
                    matches = list(re.finditer(pattern, content))
                    
                    if not matches:
                        print(f"Warning: Pattern '{pattern}' not found in {file_path}")
                        continue
                    
                    # Choose which match to use
                    match = matches[-1] if find_last else matches[0]
                    insert_pos = match.end()
                    
                    # Insert text
                    new_content = content[:insert_pos] + text + content[insert_pos:]
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"  Inserted text at pattern '{pattern[:50]}...'")
                    print(f"Modified: {file_path}")
                
                except Exception as e:
                    print(f"Error inserting text at pattern in {file_path}: {e}")
            
            elif operation == "replace_text":
                # Generic: Text replacement - supports both old_text/new_text and pattern/text formats
                if not file_path.exists():
                    print(f"Warning: File does not exist: {file_path}")
                    continue
                
                # Support both field formats
                old_text = change.get("old_text")
                new_text = change.get("new_text")
                pattern = change.get("pattern")
                text = change.get("text")
                
                if old_text and new_text is not None:
                    # Format 1: Direct text replacement
                    search_text = old_text
                    replacement_text = new_text
                elif pattern and text is not None:
                    # Format 2: Pattern-based replacement (MCP server format)
                    # Extract the replacement from pattern format like: "key": "old" -> "key": "new"
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # Use regex replacement for pattern-based
                        new_content = re.sub(pattern, text, content)
                        
                        if new_content == content:
                            print(f"Warning: Pattern '{pattern}' did not match anything in {file_path}")
                            continue
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        
                        print(f"  Replaced text using pattern in {file_path}")
                        modified_files.append(str(file_path))
                        continue
                        
                    except Exception as e:
                        print(f"Error with pattern replacement in {file_path}: {e}")
                        continue
                else:
                    print(f"Warning: Missing replacement parameters for replace_text in {file_path}")
                    print(f"  Need either (old_text, new_text) or (pattern, text)")
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if search_text not in content:
                        print(f"Warning: Text '{search_text[:50]}...' not found in {file_path}")
                        continue
                    
                    new_content = content.replace(search_text, replacement_text)
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"  Replaced text in {file_path}")
                    print(f"Modified: {file_path}")
                
                except Exception as e:
                    print(f"Error replacing text in {file_path}: {e}")
            
            else:
                print(f"ERROR: Unsupported operation '{operation}' for file {file_path}")
                print(f"Supported operations: insert_json_property, insert_json_array_item, insert_text_at_pattern, replace_text")
                print(f"Change data: {change}")
                raise ValueError(f"Unsupported operation: {operation}")

        except Exception as e:
            print(f"ERROR applying change to {file_path}: {e}")
            import traceback
            traceback.print_exc()
            # Continue with other changes instead of failing completely
            print(f"Continuing with remaining changes...")
            continue

def commit(message: str, repo_path: str = None, branch_name: str = None) -> str:
    """Create branch if missing and commit, return hash"""
    try:
        # Use provided branch name or create feature branch with timestamp
        if branch_name:
            target_branch = branch_name
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            target_branch = f"altinity_feature_{timestamp}"

        # Work in the target repository directory
        cwd = repo_path if repo_path else None

        # Check if we're on the branch already
        try:
            current_branch = subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                text=True,
                cwd=cwd
            ).strip()

            if current_branch != target_branch:
                # Create and switch to feature branch if it doesn't exist
                try:
                    subprocess.run(["git", "checkout", target_branch], check=True, cwd=cwd)
                except subprocess.CalledProcessError:
                    # Branch doesn't exist, create it
                    subprocess.run(["git", "checkout", "-b", target_branch], check=True, cwd=cwd)
        except subprocess.CalledProcessError:
            # Create branch
            subprocess.run(["git", "checkout", "-b", target_branch], check=True, cwd=cwd)

        # Stage all changes
        subprocess.run(["git", "add", "."], check=True, cwd=cwd)

        # Check if there are changes to commit
        status_result = subprocess.run(["git", "status", "--porcelain"], cwd=cwd, capture_output=True, text=True)
        if not status_result.stdout.strip():
            print("No changes to commit")
            return None  # Return None instead of failing

        # Commit
        result = subprocess.run(
            ["git", "commit", "-m", message],
            capture_output=True,
            text=True,
            check=True,
            cwd=cwd
        )

        # Get commit hash
        commit_hash = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            text=True,
            cwd=cwd
        ).strip()[:8]

        return commit_hash

    except subprocess.CalledProcessError as e:
        raise Exception(f"Git commit failed: {e}")

def revert(repo_path: str = None):
    """Restore from index or stash"""
    try:
        # Work in the target repository directory
        cwd = repo_path if repo_path else None

        # Reset to HEAD to discard changes
        subprocess.run(["git", "reset", "--hard", "HEAD"], check=True, cwd=cwd)
        print("Successfully reverted changes")
    except subprocess.CalledProcessError as e:
        raise Exception(f"Git revert failed: {e}")

def search_files(repo_path: str, query: str, file_patterns: List[str] = None) -> Dict[str, Any]:
    """Search for text in files within the repository"""
    try:
        repo_root = Path(repo_path)
        if not repo_root.exists():
            return {"error": f"Repository path does not exist: {repo_path}"}

        # Default file patterns for Altinn apps
        if file_patterns is None:
            file_patterns = ["*.json", "*.cs", "*.xml", "*.md", "*.txt"]

        matches = []

        # Search through relevant files
        for pattern in file_patterns:
            for file_path in repo_root.rglob(pattern):
                if file_path.is_file():
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        # Find all matches with line numbers
                        lines = content.split('\n')
                        for line_num, line in enumerate(lines, 1):
                            if query in line:
                                matches.append({
                                    "file": str(file_path.relative_to(repo_root)),
                                    "line": line_num,
                                    "content": line.strip(),
                                    "absolute_path": str(file_path)
                                })
                    except (UnicodeDecodeError, PermissionError):
                        # Skip binary files or files we can't read
                        continue

        return {
            "query": query,
            "matches": matches,
            "total_matches": len(matches)
        }

    except Exception as e:
        return {"error": f"Search failed: {e}"}

def modify_file_content(file_path: str, old_text: str, new_text: str) -> Dict[str, Any]:
    """Replace text in a specific file"""
    try:
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File does not exist: {file_path}"}

        # Read current content
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if old_text exists
        if old_text not in content:
            return {"error": f"Text '{old_text}' not found in file"}

        # Perform replacement
        new_content = content.replace(old_text, new_text)

        # Write back to file
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        # Count replacements
        replacements = content.count(old_text)

        return {
            "file": file_path,
            "replacements": replacements,
            "old_text": old_text,
            "new_text": new_text,
            "success": True
        }

    except Exception as e:
        return {"error": f"File modification failed: {e}"}

def modify_json_field(file_path: str, field_path: str, new_value: str) -> Dict[str, Any]:
    """Modify specific JSON fields (supports nested paths like 'resources[0].value')"""
    try:
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File does not exist: {file_path}"}

        # Read and parse JSON
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Navigate to the field and modify it
        # For simple cases like modifying a value in resources array
        if 'resources' in field_path and '[' in field_path:
            # Extract index and field name
            match = re.match(r'resources\[(\d+)\]\.(\w+)', field_path)
            if match:
                index, field = int(match.group(1)), match.group(2)
                if 'resources' in data and len(data['resources']) > index:
                    old_value = data['resources'][index].get(field)
                    data['resources'][index][field] = new_value
                else:
                    return {"error": f"Invalid array index or field: {field_path}"}
            else:
                return {"error": f"Unsupported field path format: {field_path}"}
        else:
            # Simple field modification
            if field_path in data:
                old_value = data[field_path]
                data[field_path] = new_value
            else:
                return {"error": f"Field not found: {field_path}"}

        # Write back to file with proper formatting
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return {
            "file": file_path,
            "field_path": field_path,
            "old_value": old_value,
            "new_value": new_value,
            "success": True
        }

    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in file: {e}"}
    except Exception as e:
        return {"error": f"JSON modification failed: {e}"}

def find_and_replace_in_resources(repo_path: str, old_value: str, new_value: str) -> Dict[str, Any]:
    """Find and replace text in Altinn text resource files specifically"""
    try:
        repo_root = Path(repo_path)
        resource_pattern = "App/config/texts/*.json"

        results = []

        # Find resource files
        for file_path in repo_root.glob(resource_pattern):
            if file_path.is_file():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    modified = False
                    changes = []

                    # Look for the value in resources array
                    if 'resources' in data:
                        for i, resource in enumerate(data['resources']):
                            if 'value' in resource and resource['value'] == old_value:
                                resource['value'] = new_value
                                modified = True
                                changes.append({
                                    "id": resource.get('id', f'index_{i}'),
                                    "old_value": old_value,
                                    "new_value": new_value
                                })

                    # Write back if modified
                    if modified:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)

                        results.append({
                            "file": str(file_path.relative_to(repo_root)),
                            "changes": changes,
                            "absolute_path": str(file_path)
                        })

                except (json.JSONDecodeError, PermissionError) as e:
                    results.append({
                        "file": str(file_path.relative_to(repo_root)),
                        "error": f"Failed to process: {e}"
                    })

        return {
            "old_value": old_value,
            "new_value": new_value,
            "files_modified": len([r for r in results if 'changes' in r]),
            "results": results,
            "success": True
        }

    except Exception as e:
        return {"error": f"Resource replacement failed: {e}"}


def cleanup_feature_branch(repo_path: str, feature_branch: str, base: str = "main", allow_branch_cleanup: bool = True) -> Dict[str, Any]:
    """
    Clean up feature branch on failure or zero-diff scenarios.
    
    Args:
        repo_path: Repository root path
        feature_branch: Name of feature branch to clean up
        base: Base branch to switch back to (default: "main")
        allow_branch_cleanup: Safety flag to enable cleanup
        
    Returns:
        Dictionary with cleanup status
    """
    if not allow_branch_cleanup:
        return {
            "cleaned_up": False,
            "reason": "branch_cleanup_disabled",
            "message": f"Branch cleanup disabled, {feature_branch} left intact"
        }
    
    try:
        # Get current branch
        current_result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        current_branch = current_result.stdout.strip()
        
        # Don't clean up if we're not on the feature branch
        if current_branch != feature_branch:
            return {
                "cleaned_up": False,
                "reason": "not_on_feature_branch",
                "message": f"Currently on {current_branch}, not {feature_branch}"
            }
        
        # Switch to base branch
        subprocess.run(
            ["git", "checkout", base],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Delete the feature branch
        subprocess.run(
            ["git", "branch", "-D", feature_branch],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        
        return {
            "cleaned_up": True,
            "feature_branch": feature_branch,
            "base_branch": base,
            "message": f"Feature branch {feature_branch} deleted, switched to {base}"
        }
        
    except subprocess.CalledProcessError as e:
        return {
            "cleaned_up": False,
            "error": f"Git cleanup failed: {e}",
            "stderr": e.stderr if hasattr(e, 'stderr') else str(e)
        }
    except Exception as e:
        return {
            "cleaned_up": False,
            "error": f"Cleanup failed: {e}"
        }