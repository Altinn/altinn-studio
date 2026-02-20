"""Actor node implementation leveraging MCP pipeline output."""

from __future__ import annotations

from typing import Optional

from agents.graph.state import AgentState
from agents.services.git import git_ops
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.workflows.actor.pipeline import run_actor_pipeline
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Execute the complete actor workflow pipeline and apply the resulting patch."""

    log.info("🎭 Actor node executing")
    sink.send(AgentEvent(
        type="status",
        session_id=state.session_id,
        data={"message": "Generating code changes..."},
    ))
    try:
        # Check if we already have patch data from planner
        if state.patch_data:
            log.info(f"🎯 Actor using planner's patch data with {len(state.patch_data.get('changes', []))} changes")
            patch_data = state.patch_data
        else:
            log.info("🔄 Actor generating new patch (fallback mode)")
            # Fallback: generate patch if not provided (legacy behavior)
            from agents.services.mcp import get_mcp_client

            client = get_mcp_client()

            # Run the actor pipeline to get patch data
            result = await run_actor_pipeline(
                mcp_client=client,
                repository_path=state.repo_path,
                user_goal=state.user_goal,
                repo_facts=state.repo_facts or {},
                planner_step=state.implementation_plan or (state.step_plan[0] if state.step_plan else None),
            )
            patch_data = result["patch"]

        # Normalize patch data format (convert 'op' to 'operation' for git_ops compatibility)
        normalized_patch_data = {
            "files": patch_data.get("files", []),
            "changes": []
        }
        
        def normalize_component_id(component_id: str) -> str:
            """Normalize component ID to valid Altinn pattern."""
            if not component_id:
                return component_id
            
            # Convert to lowercase and replace invalid characters
            normalized = component_id.lower()
            normalized = ''.join(c if c.isalnum() or c == '-' else '-' for c in normalized)
            
            # Ensure it starts with alphanumeric
            if normalized and not normalized[0].isalnum():
                normalized = 'field' + normalized
            
            # Ensure it follows a valid pattern - let's use 'field-{name}' format
            if '-' not in normalized:
                # If no hyphens, add 'field-' prefix
                normalized = f"field-{normalized}"
            
            # Remove multiple consecutive hyphens
            while '--' in normalized:
                normalized = normalized.replace('--', '-')
            
            # Remove trailing hyphens
            normalized = normalized.rstrip('-')
            
            return normalized
        
        for change in patch_data.get("changes", []):
            normalized_change = change.copy()
            if "op" in normalized_change and "operation" not in normalized_change:
                normalized_change["operation"] = normalized_change.pop("op")
            # Also normalize 'value' to 'item' for JSON array operations
            if normalized_change.get("operation") == "insert_json_array_item" and "value" in normalized_change and "item" not in normalized_change:
                item = normalized_change.pop("value")
                
                file_path = normalized_change.get("file", "")
                
                # Check if this is a layout file (contains form components)
                is_layout_file = "layout" in file_path and file_path.endswith(".json")
                
                # Check if this is a resource file
                is_resource_file = "resource" in file_path and file_path.endswith(".json")
                
                # Normalize component properties for layout files
                if is_layout_file and isinstance(item, dict):
                    # Fix component ID to match Altinn pattern (lowercase, hyphen-separated)
                    if "id" in item:
                        original_id = item["id"]
                        item["id"] = normalize_component_id(original_id)
                    
                    # DO NOT auto-normalize text resource bindings - they follow different pattern
                    # Text resources use app.field.{camelCase} format, not component-id.title
                    # Let the LLM generate correct text resource IDs based on dataModelBindings
                    
                    # CRITICAL: Normalize children references to match component IDs
                    if "children" in item and isinstance(item["children"], list):
                        item["children"] = [normalize_component_id(child) for child in item["children"]]
                    
                    # BE CONSERVATIVE: Only remove properties we know are invalid
                    # Don't add properties since schema loading is broken
                    # Let the validation phase catch any remaining issues
                        
                # Text resource IDs should follow app.field.{camelCase} pattern
                # DO NOT normalize them - they have their own convention separate from component IDs
                elif is_resource_file and isinstance(item, dict) and "id" in item:
                    # Keep text resource IDs as-is - they follow app.field.{camelCase} convention
                    pass
                        
                normalized_change["item"] = item
            normalized_patch_data["changes"].append(normalized_change)

        # Apply safety checks and preview
        git_ops.enforce_caps(normalized_patch_data, state.limits)
        preview = git_ops.preview(normalized_patch_data)


        # Validate patch operations before applying
        from agents.workflows.actor.pipeline import validate_patch_operations
        validation_errors = validate_patch_operations(patch_data, state.repo_facts or {}, state.repo_path)
        if validation_errors:
            log.warning(f"🚨 Patch validation found {len(validation_errors)} issues:")
            for error in validation_errors:
                log.warning(f"  - {error}")
        else:
            log.info("✅ Patch validation passed")

        log.info(f"🔧 Applying patch with {len(normalized_patch_data.get('changes', []))} changes to {len(normalized_patch_data.get('files', []))} files")
        git_ops.apply(normalized_patch_data, state.repo_path)
        
        # Check for Source of Truth files that need sync (deduplicated)
        modified_sot_files = list(set(
            change.get("file", "")
            for change in normalized_patch_data.get("changes", [])
            if change.get("file", "").endswith(".schema.json")
        ))
        
        # Sync artifacts if Source of Truth files were modified
        generated_files = []
        if modified_sot_files:
            log.info(f"🔄 Source of Truth files modified: {modified_sot_files}")
            try:
                from agents.services.mcp import get_mcp_client
                from agents.services.patching.actor_sync import _sync_single_file
                
                mcp_client = get_mcp_client()
                
                log.info("🔄 Starting artifact sync...")
                all_sync_results = []
                sync_had_error = False
                
                for sot_file in modified_sot_files:
                    try:
                        sync_result = await _sync_single_file(
                            sot_file=sot_file,
                            repo_path=state.repo_path,
                            mcp_client=mcp_client,
                            check_only=False,
                        )
                        all_sync_results.append(sync_result)
                        status = sync_result.get("status", "unknown")
                        if status == "error":
                            sync_had_error = True
                            log.error(f"❌ Sync failed for {sot_file}: {sync_result.get('errors') or sync_result}")
                        else:
                            log.info(f"✅ Synced {sot_file}: {status}")
                        
                        # Collect generated files
                        for generated in sync_result.get("generated", []):
                            file_path = generated.get("path", "")
                            if file_path:
                                # The file_path is just the filename (e.g., "model.cs")
                                # We need to construct the full relative path
                                from pathlib import Path
                                schema_dir = Path(sot_file).parent
                                full_relative_path = str(schema_dir / file_path)
                                generated_files.append(full_relative_path)
                                log.info(f"📄 Generated file: {full_relative_path}")
                        
                    except Exception as e:
                        log.error(f"❌ Failed to sync {sot_file}: {e}")
                        all_sync_results.append({
                            "file": sot_file,
                            "status": "error", 
                            "error": str(e)
                        })
                
                if sync_had_error:
                    log.error(
                        f"⚠️ Artifact sync completed with errors for {len(modified_sot_files)} files, "
                        f"generated {len(generated_files)} files"
                    )
                    # Mark verification as failed so reviewer will revert and summary will reflect failure
                    state.tests_passed = False
                    state.verify_notes = (state.verify_notes or []) + [
                        "Artifact synchronization failed for one or more datamodel files. "
                        "See logs for datamodel_sync errors.",
                    ]
                else:
                    log.info(
                        f"✅ Artifact sync completed for {len(modified_sot_files)} files, "
                        f"generated {len(generated_files)} files"
                    )
                
            except Exception as e:
                log.error(f"❌ Artifact sync failed: {e}")
                # Don't fail the entire workflow for sync issues
        
        # Ensure NavigationButtons exist in multi-page forms
        nav_modified = _ensure_navigation_buttons(state.repo_path)

        state.changed_files = preview["files"] + generated_files

        # Track files modified by navigation button post-processing
        if nav_modified:
            from pathlib import Path
            for page_name in nav_modified:
                nav_file = f"App/ui/form/layouts/{page_name}.json"
                if nav_file not in state.changed_files:
                    state.changed_files.append(nav_file)

        # Check git status to see what actually changed
        import subprocess
        try:
            git_status = subprocess.run(["git", "status", "--porcelain"], cwd=state.repo_path, capture_output=True, text=True)
            actual_changed_files = [line.split()[-1] for line in git_status.stdout.strip().split('\n') if line.strip()]
            
            if not actual_changed_files:
                log.warning("⚠️ Git status shows no actual changes after patch application")
                # Don't proceed to verification/review if no changes
                state.next_action = "stop"
                log.info("Stopping workflow - no changes to verify")
                return state
            else:
                log.info(f"✅ Git status confirms {len(actual_changed_files)} files changed")
                state.changed_files = actual_changed_files  # Update with actual changed files
        except Exception as e:
            log.error(f"Could not check git status: {e}")

        state.next_action = "verify"

        # Store additional pipeline results for potential debugging (only if we ran the pipeline)
        if not state.patch_data:
            log.info("💾 Storing pipeline results for debugging")
            state.general_plan = result.get("general_plan")
            state.tool_plan = result.get("tool_plan")
            state.tool_results = result.get("tool_results")
            state.implementation_plan = result.get("implementation_plan")
        else:
            log.info("📋 Skipping pipeline result storage (using planner's patch)")

    except git_ops.CapsExceededError as exc:
        state.next_action = "stop"

    except Exception as exc:
        log.error(f"Actor node failed: {exc}", exc_info=True)
        state.next_action = "stop"
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Actor failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state


def _ensure_navigation_buttons(repo_path: str):
    """Ensure every layout file in a multi-page form has NavigationButtons.

    This is a deterministic post-processing step that runs after the LLM patch
    is applied. It reads Settings.json to discover pages, then checks each
    layout file for a NavigationButtons component. If missing, it appends one.
    """
    import json
    from pathlib import Path

    settings_path = Path(repo_path) / "App" / "ui" / "form" / "Settings.json"
    if not settings_path.exists():
        return []

    try:
        with open(settings_path, "r") as f:
            settings = json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

    page_order = settings.get("pages", {}).get("order", [])
    if len(page_order) < 2:
        return []  # Single page — no navigation needed

    layouts_dir = Path(repo_path) / "App" / "ui" / "form" / "layouts"
    modified = []

    for idx, page_name in enumerate(page_order):
        layout_path = layouts_dir / f"{page_name}.json"
        if not layout_path.exists():
            continue

        try:
            with open(layout_path, "r") as f:
                layout = json.load(f)
        except (json.JSONDecodeError, IOError):
            continue

        components = layout.get("data", {}).get("layout", [])
        has_nav = any(
            c.get("type") == "NavigationButtons" for c in components
        )

        if has_nav:
            continue

        # Determine button config based on position
        is_first = idx == 0
        is_last = idx == len(page_order) - 1

        nav_component = {
            "id": f"nav-buttons-{page_name}",
            "type": "NavigationButtons",
            "showBackButton": not is_first,
        }

        components.append(nav_component)
        layout["data"]["layout"] = components

        with open(layout_path, "w") as f:
            json.dump(layout, f, indent=2, ensure_ascii=False)

        modified.append(page_name)

    if modified:
        log.info(
            f"🧭 Added NavigationButtons to {len(modified)} layout(s): "
            f"{', '.join(modified)}"
        )

    return modified
