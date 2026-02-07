"""Legacy facade for the actor workflow pipeline."""

from typing import Any, Dict, List, Optional

from agents.workflows.actor.pipeline import run_actor_pipeline


class PatchGenerator:
    """Backwards-compatible wrapper that delegates to the actor workflow pipeline."""

    def __init__(self, mcp_client, repository_path: str):
        self.mcp_client = mcp_client
        self.repository_path = repository_path
        self._last_output: Optional[Dict[str, Any]] = None

    @property
    def last_output(self) -> Optional[Dict[str, Any]]:
        """Return the most recent pipeline output (if available)."""

        return self._last_output

    async def generate_patch(
        self,
        user_goal: str,
        repo_facts: Dict[str, Any],
        *,
        planner_step: Optional[str] = None,
        general_plan: Optional[Dict[str, Any]] = None,
        tool_plan: Optional[List[Dict[str, Any]]] = None,
        tool_results: Optional[List[Dict[str, Any]]] = None,
        implementation_plan: Optional[Dict[str, Any]] = None,
        attachments: Optional[list] = None,
        gitea_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a patch while caching intermediate artefacts."""

        from shared.utils.logging_utils import get_logger
        log = get_logger(__name__)

        try:
            log.info("📋 Running actor pipeline...")
            pipeline_output = await run_actor_pipeline(
                self.mcp_client,
                self.repository_path,
                user_goal,
                repo_facts,
                planner_step=planner_step,
                general_plan_override=general_plan,
                tool_plan_override=tool_plan,
                tool_results_override=tool_results,
                implementation_plan_override=implementation_plan,
                attachments=attachments,
                gitea_token=gitea_token,
            )
            
            if not pipeline_output:
                log.error("❌ Actor pipeline returned None!")
                raise Exception("Actor pipeline returned None - check pipeline logs")
            
            if "patch" not in pipeline_output:
                log.error(f"❌ Actor pipeline output missing 'patch' key. Keys: {list(pipeline_output.keys())}")
                raise Exception("Actor pipeline output missing 'patch' key")
            
            patch = pipeline_output["patch"]
            if not patch:
                log.error("❌ Actor pipeline returned None for patch!")
                raise Exception("Actor pipeline patch is None - check synthesis logs")
            
            log.info(f"✅ Actor pipeline complete, patch has {len(patch.get('changes', []))} changes")
            
            self._last_output = pipeline_output
            return patch
            
        except Exception as e:
            log.error(f"❌ Patch generation error: {e}", exc_info=True)
            raise
