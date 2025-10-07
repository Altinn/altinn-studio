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
    ) -> Dict[str, Any]:
        """Generate a patch while caching intermediate artefacts."""

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
        )

        self._last_output = pipeline_output
        return pipeline_output["patch"]
