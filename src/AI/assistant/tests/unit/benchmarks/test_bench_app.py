"""The bench app: a new app made from a template the way Designer makes one, pushed to a fake Gitea."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import pytest

from benchmarks import bench_app
from benchmarks.bench_app import BenchApp, BenchAppError, app_name, build_app_tree, create_bench_app

NOW = datetime(2026, 11, 25, 9, 30, 15, tzinfo=UTC)
API_KEY = "secret-api-key"
DEVELOPER = "bench-dev"
# What RepositoryService.CreateServiceMetadata copies, and the file CreateAltinnStudioSettings writes.
COPIED_FILES = {"Dockerfile", "App.sln", ".gitignore", ".dockerignore", ".editorconfig", ".gitattributes"}
STUDIO_SETTINGS = ".altinnstudio/settings.json"


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(params=["v8", "v9"])
def template(request) -> str:
    return request.param


@pytest.fixture
def tree(template, tmp_path) -> Path:
    build_app_tree(template, "ttd", "bench-app", tmp_path, now=NOW, developer=DEVELOPER)
    return tmp_path


def test_the_tree_has_designers_steps(tree, template):
    metadata = _json(tree / "App/config/applicationmetadata.json")
    original = _json(bench_app.TEMPLATES_DIR / template / "src/App/config/applicationmetadata.json")
    assert (metadata["id"], metadata["org"], metadata["title"]) == ("ttd/bench-app", "ttd", {"nb": "bench-app"})
    assert metadata["created"] == metadata["lastChanged"] == "2026-11-25T09:30:15Z"
    assert metadata["createdBy"] == metadata["lastChangedBy"] == DEVELOPER
    assert metadata["dataTypes"] == original["dataTypes"]
    assert _json(tree / "App/config/texts/resource.nb.json") == {
        "language": "nb",
        "resources": [{"id": "appName", "value": "bench-app"}],
    }
    assert _json(tree / STUDIO_SETTINGS)["repoType"] == "App"
    assert "[ORG]" in (tree / "App/config/authorization/policy.xml").read_text()


def test_the_tree_has_only_what_designer_copies(tree, template):
    files = {path.relative_to(tree).as_posix() for path in tree.rglob("*") if path.is_file()}
    assert all(f.split("/")[0] in ("App", "deployment") or f in COPIED_FILES | {STUDIO_SETTINGS} for f in files)
    assert files >= COPIED_FILES
    assert "App/TestDummy.cs" not in files
    version = re.search(r'Include="Altinn\.App\.Api" Version="(\d+)\.', (tree / "App/App.csproj").read_text())
    assert version and version.group(1) == template.removeprefix("v")


def test_the_app_name_is_one_designer_accepts(template):
    assert re.match(r"^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$", app_name(template, NOW))
    assert app_name(template, NOW) != app_name(template, NOW + timedelta(seconds=1))
    assert app_name("v8", NOW) != app_name("v9", NOW)
    with pytest.raises(ValueError, match="not a valid app name"):
        app_name("v" + "9" * 20, NOW)
    with pytest.raises(ValueError, match=r"Available: .*v9"):
        bench_app._template_source("v1")


def test_the_urls_default_to_the_local_stack(monkeypatch):
    for name in ("BENCH_GITEA_CLONE_BASE", "BENCH_GITEA_PROXY_URL", "BENCH_ORG"):
        monkeypatch.delenv(name, raising=False)
    app = BenchApp(org="ttd", app="bench-v9-x", template="v9")
    assert app.agent_url == "http://gitea-proxy:81/ttd/bench-v9-x.git"
    assert app.clone_url == "http://localhost/repos/ttd/bench-v9-x.git"
    assert bench_app.bench_org() == "ttd"


class FakeGitea:
    """Gitea's REST API. A created repository is an empty bare repository on disk that git pushes to."""

    def __init__(self, repos: Path) -> None:
        self.repos = repos
        self.create_status = 201
        self.create_body = ""
        self.make_repositories = True
        self.requests: list[tuple[str, str, dict[str, str], object]] = []

    def request(self, method: str, url: str, **kwargs) -> httpx.Response:
        path = url.removeprefix(f"{self.repos.as_uri()}/api/v1")
        self.requests.append((method, path, kwargs["headers"], kwargs.get("json")))
        if method == "POST":
            if self.create_status == 201 and self.make_repositories:
                bare = self.repos / path.split("/")[2] / f"{kwargs['json']['name']}.git"
                subprocess.run(["git", "init", "--bare", "--quiet", str(bare)], check=True)
            return httpx.Response(self.create_status, text=self.create_body)
        return httpx.Response(204)


@pytest.fixture
def gitea(monkeypatch, tmp_path) -> FakeGitea:
    fake = FakeGitea(tmp_path / "repos")
    monkeypatch.setenv("BENCH_GITEA_CLONE_BASE", fake.repos.as_uri())
    monkeypatch.setenv("BENCH_DEVELOPER", DEVELOPER)
    monkeypatch.setattr(httpx, "request", fake.request)
    return fake


def _git(repository: Path, *args: str) -> str:
    return subprocess.run(["git", "--git-dir", str(repository), *args], capture_output=True, text=True).stdout


def test_creating_the_app_pushes_one_commit_with_designers_options(gitea, template):
    app = create_bench_app(template, org="ttd", api_key=API_KEY, now=NOW)

    assert app == BenchApp(org="ttd", app=app_name(template, NOW), template=template)
    [(method, path, headers, payload)] = gitea.requests
    assert (method, path, headers["X-Api-Key"]) == ("POST", "/orgs/ttd/repos", API_KEY)
    assert payload == {"name": app.app, "auto_init": False, "private": False}
    repository = gitea.repos / "ttd" / f"{app.app}.git"
    assert _git(repository, "log", "--format=%s|%an", "master").splitlines() == [f"App created|{DEVELOPER}"]
    metadata = json.loads(_git(repository, "show", "master:App/config/applicationmetadata.json"))
    assert metadata["id"] == f"ttd/{app.app}"


@pytest.mark.parametrize(
    ("status", "body", "says"),
    [(401, "", "AGENT_DESIGNER_API_KEY"), (403, "", "BENCH_ORG"), (500, f"error for key {API_KEY}", "HTTP 500")],
)
def test_a_failed_create_says_what_to_check_without_the_key(gitea, status, body, says):
    gitea.create_status, gitea.create_body = status, body

    with pytest.raises(BenchAppError, match=says) as raised:
        create_bench_app("v9", org="ttd", api_key=API_KEY, now=NOW)
    assert API_KEY not in str(raised.value)


def test_a_failed_push_deletes_the_repository(gitea):
    gitea.make_repositories = False

    with pytest.raises(BenchAppError, match="Could not push") as raised:
        create_bench_app("v9", org="ttd", api_key=API_KEY, now=NOW)
    assert API_KEY not in str(raised.value)
    assert ("DELETE", f"/repos/ttd/{app_name('v9', NOW)}") in [(m, p) for m, p, _, _ in gitea.requests]
