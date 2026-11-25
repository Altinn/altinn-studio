"""A new Altinn app for a benchmark run, made from an app template in this repository and pushed to Gitea.

The e2e bench gives the agent a fresh app per run and template version, so that every result names the template
it ran on and a person can open the app afterwards. Designer's create-app endpoint does not accept API keys, so
this module repeats its steps instead: `RepositoryService.CreateService` in src/Designer/backend creates the Gitea
repository, copies the template, adds the `appName` text, `.altinnstudio/settings.json` and the core properties of
the application metadata, and pushes one commit. Change this module when that method changes.
"""

from __future__ import annotations

import contextlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Any

import httpx

TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "App" / "template"

DEFAULT_ORG = "ttd"
DEFAULT_CLONE_BASE = "http://localhost/repos"
DEFAULT_GITEA_PROXY_URL = "http://gitea-proxy:81"
HTTP_TIMEOUT_SECONDS = 30

# Designer's General.DefaultBranch, which is also DEFAULT_BRANCH in src/gitea/files/conf/app.ini.
DEFAULT_BRANCH = "master"
COMMIT_MESSAGE = "App created"
COMMIT_EMAIL_DOMAIN = "noreply.altinn.studio"

# The route constraint on the app name in Designer's RepositoryController.
APP_NAME_PATTERN = re.compile(r"^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$")

# What RepositoryService.CreateServiceMetadata copies from a template.
COPIED_FOLDERS = ("App", "deployment")
COPIED_FILES = ("Dockerfile", "App.sln", ".gitignore", ".dockerignore", ".editorconfig", ".gitattributes")


class BenchAppError(RuntimeError):
    """The bench app could not be created. The message says what to check."""


@dataclass(frozen=True)
class BenchApp:
    org: str
    app: str
    template: str

    @property
    def agent_url(self) -> str:
        """The repository as the agent container reaches it."""
        return f"{gitea_proxy_url()}/{self.org}/{self.app}.git"

    @property
    def clone_url(self) -> str:
        """The repository as this host reaches it."""
        return f"{clone_base()}/{self.org}/{self.app}.git"


def bench_org() -> str:
    return os.environ.get("BENCH_ORG") or DEFAULT_ORG


def clone_base() -> str:
    return os.environ.get("BENCH_GITEA_CLONE_BASE", DEFAULT_CLONE_BASE).rstrip("/")


def gitea_proxy_url() -> str:
    return os.environ.get("BENCH_GITEA_PROXY_URL", DEFAULT_GITEA_PROXY_URL).rstrip("/")


def template_ids() -> list[str]:
    """The templates Designer offers: the folders whose `src` has an apptemplate.json."""
    return sorted(manifest.parent.parent.name for manifest in TEMPLATES_DIR.glob("*/src/apptemplate.json"))


def app_name(template: str, now: datetime) -> str:
    """`bench-<template>-<local time to the second>`, which Designer accepts as an app name."""
    name = f"bench-{template}-{now.astimezone():%Y%m%d-%H%M%S}"
    if not APP_NAME_PATTERN.match(name):
        raise ValueError(f"{name!r} is not a valid app name: a template ID must be short, lower case and dot-free")
    return name


def build_app_tree(template: str, org: str, app: str, destination: Path, *, now: datetime, developer: str) -> None:
    """Write the files a new app made from `template` has in its first commit to `destination`."""
    source = _template_source(template)
    for path in _release_files(source):
        if path.parts[0] in COPIED_FOLDERS or str(path) in COPIED_FILES:
            target = destination / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / path, target)
    missing = [name for name in COPIED_FILES if not (destination / name).is_file()]
    if missing:
        raise BenchAppError(f"Template {template} has no {', '.join(missing)}, which Designer copies to a new app")

    _add_app_name_text(destination, app)
    _write_studio_settings(destination)
    _set_core_properties(destination, org, app, now=now, developer=developer)


def create_bench_app(template: str, *, org: str, api_key: str, now: datetime | None = None) -> BenchApp:
    """Create `<org>/bench-<template>-<stamp>` in Gitea with the first commit Designer would push."""
    now = now or datetime.now(UTC)
    bench_app = BenchApp(org=org, app=app_name(template, now), template=template)
    developer = os.environ.get("BENCH_DEVELOPER", "benchmark")
    with tempfile.TemporaryDirectory(prefix=f"{bench_app.app}-") as workdir:
        tree = Path(workdir)
        build_app_tree(template, org, bench_app.app, tree, now=now, developer=developer)
        _create_repository(bench_app, api_key)
        try:
            _commit_and_push(tree, bench_app, developer, api_key)
        except BenchAppError:
            # Designer deletes the repository when a step after creating it fails.
            with contextlib.suppress(BenchAppError):
                _call_gitea("DELETE", f"/repos/{org}/{bench_app.app}", api_key)
            raise
    return bench_app


def _template_source(template: str) -> Path:
    available = template_ids()
    if template not in available:
        raise ValueError(f"{template!r} is not a known app template. Available: {', '.join(available) or 'none'}.")
    return TEMPLATES_DIR / template / "src"


def _release_files(source: Path) -> list[PurePosixPath]:
    """The files git tracks in `source`, less those `.releaseignore` names, as the Dockerfile's release does.

    Listing tracked files rather than the folder keeps a local build's output out of the app."""
    result = subprocess.run(["git", "-C", str(source), "ls-files", "-z"], capture_output=True, text=True)
    if result.returncode != 0:
        raise BenchAppError(f"git could not list the files of {source}: {result.stderr}")
    ignored = [line.strip() for line in (source / ".releaseignore").read_text(encoding="utf-8").splitlines()]
    files = [path for path in result.stdout.split("\0") if path and (source / path).is_file()]
    return [
        PurePosixPath(path)
        for path in files
        if not any(path == entry or (entry.endswith("/") and path.startswith(entry)) for entry in ignored if entry)
    ]


def _add_app_name_text(destination: Path, app: str) -> None:
    """TextsService.CreateLanguageResources."""
    path = destination / "App" / "config" / "texts" / "resource.nb.json"
    texts = json.loads(path.read_text(encoding="utf-8"))
    resources = [*(texts.get("resources") or []), {"id": "appName", "value": app}]
    # Designer's TextResource model has only these two properties, so `$schema` does not survive the rewrite.
    _write_json(path, {"language": texts.get("language") or "nb", "resources": resources})


def _write_studio_settings(destination: Path) -> None:
    """RepositoryService.CreateAltinnStudioSettings, serialized as AltinnGitRepository.SaveAltinnStudioSettings does."""
    settings = {"repoType": "App", "imports": None, "useNullableReferenceTypes": True, "templates": []}
    _write_json(destination / ".altinnstudio" / "settings.json", settings)


def _set_core_properties(destination: Path, org: str, app: str, *, now: datetime, developer: str) -> None:
    """ApplicationMetadataService.SetCoreProperties, with the app name as the title, as RepositoryController.CreateApp
    passes it."""
    path = destination / "App" / "config" / "applicationmetadata.json"
    metadata: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    timestamp = now.astimezone(UTC).isoformat().replace("+00:00", "Z")
    metadata.update(
        org=org,
        id=f"{org}/{app}",
        title={"nb": app},
        created=timestamp,
        createdBy=developer,
        lastChanged=timestamp,
        lastChangedBy=developer,
    )
    _write_json(path, metadata)


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _call_gitea(method: str, path: str, api_key: str, **kwargs: Any) -> httpx.Response:
    url = f"{clone_base()}/api/v1{path}"
    try:
        return httpx.request(method, url, headers={"X-Api-Key": api_key}, timeout=HTTP_TIMEOUT_SECONDS, **kwargs)
    except httpx.HTTPError as error:
        raise BenchAppError(
            f"Could not reach Gitea at {clone_base()}: {_redact(str(error), api_key)}. "
            "Check that the local stack runs and that BENCH_GITEA_CLONE_BASE points at its /repos."
        ) from None


def _create_repository(bench_app: BenchApp, api_key: str) -> None:
    """RepositoryService.CreateRemoteRepository, with the endpoint and options of GiteaClient.CreateRepository."""
    org, app = bench_app.org, bench_app.app
    response = _call_gitea(
        "POST", f"/orgs/{org}/repos", api_key, json={"name": app, "auto_init": False, "private": False}
    )
    if response.status_code == 201:
        return
    reasons = {
        401: "Gitea did not accept the API key. Check AGENT_DESIGNER_API_KEY.",
        403: f"The API key's user may not create repositories in {org}. Check that the user is in a team of {org} "
        "that can create repositories, or set BENCH_ORG to an organization where it is.",
        404: f"Gitea has no organization {org}. Check BENCH_ORG.",
        409: f"{org}/{app} already exists. Run again a second later, or delete it in Gitea.",
    }
    reason = reasons.get(response.status_code) or _excerpt(response, api_key)
    raise BenchAppError(f"Could not create {org}/{app} (HTTP {response.status_code}): {reason}")


def _commit_and_push(tree: Path, bench_app: BenchApp, developer: str, api_key: str) -> None:
    """SourceControlService.PushChangesForRepository: one commit by the developer, on the default branch."""
    identity = ["-c", f"user.name={developer}", "-c", f"user.email={developer}@{COMMIT_EMAIL_DOMAIN}"]
    failure = "Could not make the first commit of the bench app"
    _git(tree, ["init", "--quiet", f"--initial-branch={DEFAULT_BRANCH}"], api_key, failure)
    _git(tree, ["add", "--all"], api_key, failure)
    _git(tree, [*identity, "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", COMMIT_MESSAGE], api_key, failure)
    url = bench_app.clone_url
    _git(
        tree,
        ["-c", f"http.extraHeader=X-Api-Key: {api_key}", "push", "--quiet", url, f"{DEFAULT_BRANCH}:{DEFAULT_BRANCH}"],
        api_key,
        f"Could not push the bench app to {url}. Check that BENCH_GITEA_CLONE_BASE points at the local stack's "
        "/repos and that the API key's user may push there",
    )


def _git(tree: Path, args: list[str], api_key: str, failure: str) -> None:
    """Run git in `tree`, failing instead of prompting for credentials."""
    environment = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    result = subprocess.run(["git", "-C", str(tree), *args], capture_output=True, text=True, env=environment)
    if result.returncode != 0:
        error = result.stderr.strip() or f"git exited with {result.returncode}"
        raise BenchAppError(f"{failure}. git said: {_redact(error, api_key)}")


def _excerpt(response: httpx.Response, api_key: str) -> str:
    return _redact(response.text[:300], api_key) or "no response body"


def _redact(text: str, api_key: str) -> str:
    return text.replace(api_key, "***") if api_key else text
