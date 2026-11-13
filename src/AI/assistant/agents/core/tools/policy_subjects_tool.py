"""`altinn_policy_subjects` — the access packages and roles a policy can name, live from Altinn Access Management.

The studio-policy skill says what the lists are and where they live, without naming this tool.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from agents.altinn import access_management
from agents.altinn.access_management import AccessManagementError
from agents.core.tool import LoopContext, Tool, ToolResult

_DOCS_URL = "https://docs.altinn.studio/nb/authorization/what-do-you-get/accesspackages/"


class PolicySubjectsArgs(BaseModel):
    kind: Literal["access_packages", "roles", "altinn2_roles"] = Field(
        default="access_packages",
        description=(
            "`access_packages`; `roles`, the roles Studio's policy editor offers, such as `dagl` and `priv`; or "
            "`altinn2_roles`, the Altinn 2 roles that stop giving access at the end of 2026."
        ),
    )
    search: str | None = Field(
        default=None,
        description=(
            "Return only entries whose code, name, description or area contains every word, ignoring case. "
            "Example: `regnskap`."
        ),
    )
    group: str | None = Field(
        default=None,
        description=(
            "Access packages only: list one group: `Allment`, `Bransje`, `Særskilt`, `Innbygger` or `Vergemål`."
        ),
    )


class PolicySubjectsTool(Tool[PolicySubjectsArgs]):
    """Access packages and roles for `App/config/authorization/policy.xml`."""

    name = "altinn_policy_subjects"
    description = (
        "Look up the access packages and roles an app's authorization policy can name, live from Altinn Access "
        "Management: the same lists Studio's policy editor offers, with each code, name and description. Use it "
        "before you add a package or role to the policy, and to explain one the policy already has.  For access "
        "packages, give `group` or `search`. Without them you get the groups and areas to choose from."
    )
    input_schema = PolicySubjectsArgs
    is_concurrency_safe = True

    async def run(self, args: PolicySubjectsArgs, ctx: LoopContext) -> ToolResult:
        try:
            if args.kind == "access_packages":
                content = access_management.describe_access_packages(
                    await access_management.access_packages(), search=args.search, group=args.group
                )
                title = "Tilgangspakker fra Altinn Autorisasjon"
            else:
                content = access_management.describe_roles(
                    await access_management.roles(), search=args.search, altinn2=args.kind == "altinn2_roles"
                )
                title = "Roller fra Altinn Autorisasjon"
        except AccessManagementError as exc:
            return ToolResult(
                content=(
                    f"Could not read the list from Altinn Access Management: {exc}. Tell the user. Do not write a "
                    "package or role code into the policy that you have not seen in the list."
                ),
                is_error=True,
            )
        except ValueError as exc:
            return ToolResult(content=str(exc), is_error=True)
        return ToolResult(content=content, metadata={"source": {"title": title, "url": _DOCS_URL, "kind": "docs"}})
