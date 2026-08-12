"""Runs `studioctl app upgrade v9` for a single app and reports what happened.

Why this is more than "run the command and check the exit code":

A test run across all 632 prod apps on Altinn.App 8.x showed studioctl reports
"upgrade failed with exit code 3" when an app needs hand-porting, but returns
exit code 1 to the shell — the same code a real crash returns. Classifying on
the exit code alone therefore reports normal, expected migration work as a
tool failure. We classify on the log text instead.

The same run showed four distinct outcomes worth telling apart in the UI:

    clean     upgraded with no warnings
    manual    upgraded, but the app uses APIs removed in v9 and needs porting
    rejected  studioctl's version check refused to start
    failed    the upgrade itself errored

`rejected` is worth pre-empting. The version check requires both
Altinn.App.Api and Altinn.App.Core declared explicitly at 8.x, and does not
understand NuGet range syntax (`Version="[8.11.3]"`). Together those rejected
45 of 632 apps — all of them genuine 8.x apps. `preflight()` detects both
before we start, so the UI can say so up front instead of failing later.

Upgrades run in their own working tree under `upgrade-work/`, cloned fresh
from the repo's default branch. The `apps-{env}/` clones must not be touched:
they are the scan corpus, and they sit on the deployed release commit in
detached HEAD — the wrong base for a pull request.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from xml.etree import ElementTree as ET

from .config import Settings
from .db import get_conn
from .fetcher import Fetcher, inject_credentials
from .jobs import Job

UPGRADE_TIMEOUT = 600          # seconds before studioctl is killed
CLONE_TIMEOUT = 300
BUILD_TIMEOUT = 900

# Markers studioctl writes. Order matters: `rejected` is checked before
# `manual`, since a rejected run never reaches the manual-follow-up stage.
REJECTED_MARKER = "not supported for the 'v8Tov9' upgrade"
MANUAL_MARKERS = ("need manual follow-up", "exit code 3")

ANSI = re.compile(r"\x1b\[[0-9;]*m")


# The run is presented as a sequence of steps, like a CI pipeline: each one
# reports running → ok/warn/fail/skipped, and carries its own log. Non-technical
# users read the step list; developers expand the step they care about.
STEPS: list[tuple[str, str]] = [
    ("studioctl", "Verifiser at studioctl er installert"),
    ("studioctl_version", "Sjekk at studioctl er oppdatert"),
    ("clone", "Hent appen fra Altinn Studio"),
    ("preflight", "Sjekk at appen kan oppgraderes"),
    ("upgrade", "Kjør migreringen til v9"),
    ("build", "Bygg appen etter oppgradering"),
    ("publish", "Opprett pull request"),
]


@dataclass
class StepResult:
    """Outcome of one step. `warn` means done but with something to follow up."""
    status: str = "pending"        # pending | running | ok | warn | fail | skipped
    detail: str = ""
    items: list[str] = field(default_factory=list)


@dataclass
class Preflight:
    eligible: bool
    version: str = ""
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _strip_range(version: str) -> str:
    """`[8.11.3]` and `(8.1.0,9.0.0)` are valid NuGet. Return the bare version."""
    return version.strip().lstrip("[(").split(",")[0].rstrip("])").strip()


def read_package_versions(csproj: Path) -> dict[str, str]:
    """Altinn.App package references declared in the project file, verbatim."""
    out: dict[str, str] = {}
    try:
        root = ET.parse(csproj).getroot()
    except (OSError, ET.ParseError):
        return out
    for el in root.iter():
        tag = el.tag.split("}", 1)[-1]
        if tag != "PackageReference":
            continue
        name = el.get("Include") or el.get("Update") or ""
        if not name.startswith("Altinn.App."):
            continue
        version = el.get("Version")
        if not version:
            for child in el:
                if child.tag.split("}", 1)[-1] == "Version" and child.text:
                    version = child.text.strip()
                    break
        if version:
            out[name] = version.strip()
    return out


def preflight(csproj: Path) -> Preflight:
    """Decide whether studioctl will accept this app, before we start it."""
    if not csproj.is_file():
        return Preflight(False, reasons=[
            f"Fant ingen prosjektfil på {csproj.name}. "
            "studioctl krever App/App.csproj."])

    pkgs = read_package_versions(csproj)
    api = pkgs.get("Altinn.App.Api")
    core = pkgs.get("Altinn.App.Core")
    raw = api or core or ""
    version = _strip_range(raw)

    reasons: list[str] = []
    warnings: list[str] = []

    if not raw:
        reasons.append("Fant ingen Altinn.App.Api- eller Altinn.App.Core-referanse.")
    elif not version.startswith("8."):
        reasons.append(
            f"Appen står på {version}. Oppgraderingen gjelder kun 8.x.")

    # Two known limitations in studioctl's version check. Both reject apps that
    # are perfectly valid 8.x — we say so here rather than after a failed run.
    if raw and raw != version:
        reasons.append(
            f'Versjonen er pinnet med rekkeviddesyntaks (Version="{raw}"). '
            "studioctls versjonssjekk tolker ikke klammene og vil avvise appen. "
            "Skriv den om til en ren versjon først.")
    if api and not core:
        reasons.append(
            "Bare Altinn.App.Api er deklarert; Altinn.App.Core kommer transitivt. "
            "Versjonssjekken krever at begge står eksplisitt i prosjektfila.")
    if api and core and _strip_range(api) != _strip_range(core):
        warnings.append(
            f"Api ({_strip_range(api)}) og Core ({_strip_range(core)}) står på "
            "ulike versjoner.")

    return Preflight(not reasons, version, reasons, warnings)


def classify(log_text: str, rc: int) -> str:
    """clean | manual | rejected | failed — read from the log, not the exit code."""
    if rc == 0:
        return "clean"
    text = ANSI.sub("", log_text)
    if REJECTED_MARKER in text:
        return "rejected"
    if any(m in text for m in MANUAL_MARKERS):
        return "manual"
    return "failed"


def manual_items(log_text: str) -> list[str]:
    """What studioctl says must be ported by hand.

    It lists these as indented lines under the removed-API check. Lines that
    are file references (`Program.cs:19: IProcessTaskEnd`) or dependency-floor
    bumps are noise here — the caller wants the instruction, not the sites.
    """
    text = ANSI.sub("", log_text)
    items: list[str] = []
    for line in text.splitlines():
        if not line.startswith("  ") or not line.strip():
            continue
        body = line.strip()
        if body.startswith("Raised ") or re.match(r"^[\w/.-]+\.\w+(:\d+)?:", body):
            continue
        if body not in items:
            items.append(body)
    return items[:20]


class Upgrader:
    def __init__(self, s: Settings) -> None:
        self.s = s
        self.fetcher = Fetcher(s)

    async def resolve_host(self, org: str, app: str) -> tuple[str, str]:
        """Which Studio instance holds this repo, and can we write there?

        Reuses the two credential pairs the config page already has, tried in
        the same order the fetcher uses. When pull requests are enabled we
        prefer a host whose token can actually write — otherwise a rehearsal on
        dev would clone from production and then be unable to open the PR.

        Returns (base, reason). base is "" when the repo was found nowhere.
        """
        import httpx
        found: list[tuple[str, bool]] = []
        # Record what each host actually answered. "Not found anywhere" is a
        # dead end for the user; "dev said 404, prod had no token" is not.
        tried: list[str] = []
        for base in self.s.STUDIO_HOSTS:
            host = base.replace("https://", "")
            _, token = self.s.studio_credentials(base)
            if not token:
                tried.append(f"{host}: ingen token konfigurert")
                continue
            try:
                async with httpx.AsyncClient(timeout=20) as c:
                    r = await c.get(
                        f"{base}/repos/api/v1/repos/{org}/{app}",
                        headers={"Authorization": f"token {token}"})
            except Exception as e:
                tried.append(f"{host}: fikk ikke kontakt ({e})")
                continue
            if r.status_code == 200:
                scopes, _ = await token_scopes(base, token)
                found.append((base, can_write(scopes)))
            elif r.status_code == 404:
                tried.append(f"{host}: appen finnes ikke der (404)")
            elif r.status_code == 401:
                tried.append(f"{host}: tokenet ble avvist (401)")
            elif r.status_code == 403:
                tried.append(f"{host}: tokenet mangler tilgang (403)")
            else:
                tried.append(f"{host}: svarte {r.status_code}")

        if not found:
            return "", (f"Fant ikke {org}/{app}. " + " · ".join(tried))
        if self.s.allow_gitea_write:
            for base, writable in found:
                if writable:
                    return base, f"{base} (tokenet kan opprette pull request)"
        base = found[0][0]
        return base, base

    def _redact(self, text: str) -> str:
        """Never let a token reach the UI, the log column or the database."""
        for secret in (self.s.git_token, self.s.dev_git_token):
            if secret:
                text = text.replace(secret, "***")
        return text

    @property
    def work_dir(self) -> Path:
        return self.s.data_dir / "upgrade-work"

    def app_work_dir(self, org: str, app: str) -> Path:
        return self.work_dir / f"{org}-{app}"

    async def _run(self, job: Job, argv: list[str], cwd: Optional[Path],
                   timeout: int, phase: str) -> tuple[int, str]:
        """Run a subprocess, streaming each output line to the job as it lands."""
        proc = await asyncio.create_subprocess_exec(
            *argv,
            cwd=str(cwd) if cwd else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            stdin=asyncio.subprocess.DEVNULL,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "NO_COLOR": "1"},
        )
        collected: list[str] = []

        async def pump() -> None:
            assert proc.stdout is not None
            async for raw in proc.stdout:
                line = self._redact(ANSI.sub("", raw.decode(errors="replace")).rstrip())
                if not line:
                    continue
                collected.append(line)
                await job.emit({"kind": "log", "phase": phase, "message": line})

        # Wait on the process, not on the output stream. `studioctl` leaves
        # `studioctl-server` running in the background, and that child inherits
        # stdout — so the pipe stays open after the command itself is done.
        # Waiting for EOF would hang until the timeout on every single upgrade.
        pump_task = asyncio.create_task(pump())
        try:
            rc = await asyncio.wait_for(proc.wait(), timeout)
        except asyncio.TimeoutError:
            pump_task.cancel()
            proc.kill()
            await proc.wait()
            collected.append(f"Avbrutt: brukte mer enn {timeout} sekunder.")
            await job.emit({"kind": "error", "phase": phase,
                            "message": collected[-1]})
            return 124, "\n".join(collected)

        # Give the reader a moment to drain what is already buffered, then let
        # it go regardless of whether the pipe ever closes.
        try:
            await asyncio.wait_for(pump_task, 5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            pump_task.cancel()
        return rc, "\n".join(collected)

    async def prepare_worktree(self, job: Job, org: str, app: str,
                               base: str) -> tuple[Optional[Path], str]:
        """Fresh clone of the default branch. Returns (path, branch)."""
        target = self.app_work_dir(org, app)
        # Always start from a clean tree: a half-finished previous attempt
        # would otherwise be mistaken for the app's real state.
        if target.exists():
            await job.emit({"kind": "info", "phase": "prepare",
                            "message": "Fjerner tidligere arbeidskopi"})
            shutil.rmtree(target, ignore_errors=True)
        target.parent.mkdir(parents=True, exist_ok=True)

        user, token = self.s.studio_credentials(base)
        url = inject_credentials(base, f"/repos/{org}/{app}.git", user, token)
        host = base.split("://", 1)[1]
        await job.emit({"kind": "log", "step": "clone",
                        "message": f"Kloner {org}/{app} fra {host} (default-branch)"})
        rc, out = await self._run(
            job, ["git", "clone", "--quiet", url, str(target)], None,
            CLONE_TIMEOUT, "prepare")
        if rc != 0 or not target.exists():
            # Never let a token reach the UI or the database.
            safe = self._redact(out)
            await job.emit({"kind": "error", "phase": "prepare",
                            "message": f"Kloning feilet: {safe[-300:]}"})
            return None, ""

        await self._block_writes(target)

        rc, out = await self._run(job, ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                                  target, 30, "prepare")
        branch = out.strip().splitlines()[-1] if out.strip() else "master"
        await job.emit({"kind": "info", "phase": "prepare",
                        "message": f"Arbeidskopi klar på «{branch}» (push blokkert)"})
        return target, branch

    async def _block_writes(self, target: Path) -> None:
        """Make it structurally impossible for this clone to write to Gitea.

        Phase 1 only reads, but the working tree lives on disk between runs and
        later phases will add branch/push/PR behind an explicit opt-in. Until
        that opt-in exists, every clone is neutered the moment it is created:
        the push URL is pointed at nothing, and a pre-push hook refuses.
        Cheap insurance against an accidental write to someone's app repo.
        """
        if self.s.allow_gitea_write:
            return
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(target), "remote", "set-url", "--push",
            "origin", "BLOCKED-NO-PUSH",
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await proc.wait()
        hooks = target / ".git" / "hooks"
        hooks.mkdir(parents=True, exist_ok=True)
        hook = hooks / "pre-push"
        hook.write_text(
            "#!/bin/sh\n"
            "echo 'BLOCKED: Fleet Stats skal ikke pushe til app-repoer.' >&2\n"
            "exit 1\n")
        hook.chmod(0o755)

    async def _step(self, job: Job, key: str, status: str,
                    detail: str = "", items: Optional[list[str]] = None) -> None:
        """Announce a step transition. The UI renders these as the checklist."""
        await job.emit({"kind": "step", "step": key, "status": status,
                        "title": dict(STEPS)[key], "message": detail,
                        "items": items or []})

    async def _studioctl_version(self, job: Job, step: str) -> Optional[str]:
        """Installed version, e.g. `v0.1.0-preview.18`. None if not installed."""
        rc, out = await self._run(job, ["studioctl", "--version"], None, 30, step)
        if rc != 0:
            return None
        m = re.search(r"v\d+\.\d+\.\d+[\w.\-]*", out)
        return m.group(0) if m else "ukjent"

    async def _install_studioctl(self, job: Job, step: str) -> bool:
        """Install studioctl into the data volume when it is missing.

        The container normally bakes it in, but running outside Docker (or
        after a version bump that has not been rebuilt) should not dead-end the
        user. The binary goes on PATH via the process environment, and the
        checksum published with the release is verified before it is used.
        """
        import httpx
        target_dir = self.s.data_dir / "bin"
        target_dir.mkdir(parents=True, exist_ok=True)
        binary = target_dir / "studioctl"
        arch = "arm64" if os.uname().machine in ("arm64", "aarch64") else "amd64"
        system = "darwin" if os.uname().sysname == "Darwin" else "linux"

        tag = await self._latest_studioctl_tag()
        if not tag:
            return False
        base = ("https://github.com/Altinn/altinn-studio/releases/download/"
                f"studioctl/{tag}")
        name = f"studioctl-{system}-{arch}"
        await job.emit({"kind": "log", "step": step,
                        "message": f"Laster ned {name} ({tag})"})
        try:
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
                blob = (await c.get(f"{base}/{name}")).content
                sums = (await c.get(f"{base}/SHA256SUMS")).text
        except Exception as e:
            await job.emit({"kind": "error", "step": step,
                            "message": f"Nedlasting feilet: {e}"})
            return False

        import hashlib
        digest = hashlib.sha256(blob).hexdigest()
        expected = next((l.split()[0] for l in sums.splitlines()
                         if l.strip().endswith(name)), "")
        if not expected or expected != digest:
            await job.emit({"kind": "error", "step": step,
                            "message": "Sjekksummen stemmer ikke — avbryter "
                                       "installasjonen."})
            return False

        binary.write_bytes(blob)
        binary.chmod(0o755)
        os.environ["PATH"] = f"{target_dir}:{os.environ.get('PATH', '')}"
        await job.emit({"kind": "log", "step": step,
                        "message": f"Installert i {binary}"})
        return True

    async def _latest_studioctl_tag(self) -> Optional[str]:
        """Newest published studioctl release tag, e.g. `v0.1.0-preview.21`."""
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.get(
                    "https://api.github.com/repos/Altinn/altinn-studio/releases",
                    params={"per_page": "30"})
            for rel in r.json():
                tag = rel.get("tag_name", "")
                if tag.startswith("studioctl/"):
                    return tag.split("/", 1)[1]
        except Exception:
            return None
        return None

    async def _build(self, job: Job, target: Path) -> tuple[Optional[bool], list[str]]:
        """Compile the upgraded app. Returns (ok, first errors).

        This step is not optional dressing. Across all 632 prod apps on 8.x,
        110 upgraded with no warning at all and then failed to compile — so an
        upgrade that only checks studioctl's own output reports success for
        roughly one app in six that a developer cannot actually build.
        """
        csproj = target / "App" / "App.csproj"
        if not csproj.is_file():
            return False, ["Fant ingen App/App.csproj å bygge."]
        if shutil.which("dotnet") is None:
            # Image built without the SDK. Say so plainly rather than
            # reporting a build failure the app is not responsible for.
            return None, ["Fant ingen .NET SDK i containeren, så appen ble "
                          "ikke bygget. Bygg imaget uten SKIP_DOTNET=1 for å "
                          "få verifisert at den kompilerer."]
        rc, out = await self._run(
            job, ["dotnet", "build", str(csproj), "-c", "Release", "--nologo",
                  "-nodeReuse:false", "-consoleloggerparameters:NoSummary",
                  "-verbosity:quiet"],
            None, BUILD_TIMEOUT, "build")
        if rc == 0:
            return True, []
        errors: list[str] = []
        for line in out.splitlines():
            m = re.search(r": (error [A-Z]+\d+: .*)$", line)
            if m:
                # Strip the absolute container path; keep the repo-relative part.
                loc = line.split(":", 1)[0]
                rel = loc.replace(str(target) + "/", "")
                text = f"{rel}: {m.group(1)}" if rel != loc else m.group(1)
                if text not in errors:
                    errors.append(text)
        if not errors:
            errors = ["Bygget feilet uten en gjenkjennelig kompileringsfeil "
                      "— se full logg."]
        return False, errors[:25]

    async def run(self, job: Job, org: str, app: str, app_id: str) -> dict:
        """Verify tooling → clone → preflight → upgrade → build → publish."""
        started = datetime.now(timezone.utc).isoformat(timespec="seconds")
        t0 = time.time()
        result: dict = {
            "app_id": app_id, "org": org, "app": app,
            "outcome": "failed", "exit_code": None, "from_version": "",
            "to_version": "", "files_changed": 0, "manual": [],
            "build_ok": None, "build_errors": [], "branch": "", "pr_url": None,
            "studio": "",
            "summary": "", "started_at": started, "steps": {},
        }
        log_parts: list[str] = []

        def note(key: str, status: str, detail: str = "",
                 items: Optional[list[str]] = None) -> None:
            result["steps"][key] = {"status": status, "detail": detail,
                                    "items": items or []}

        async def mark(key: str, status: str, detail: str = "",
                       items: Optional[list[str]] = None) -> None:
            note(key, status, detail, items)
            await self._step(job, key, status, detail, items)

        async def skip_rest(after: str, why: str) -> None:
            keys = [k for k, _ in STEPS]
            for k in keys[keys.index(after) + 1:]:
                await mark(k, "skipped", why)

        # 1 — is studioctl installed? Install it if not.
        await mark("studioctl", "running")
        version = await self._studioctl_version(job, "studioctl")
        if version is None:
            await mark("studioctl", "running",
                       "Ikke installert — laster ned og installerer")
            if not await self._install_studioctl(job, "studioctl"):
                detail = ("Fant ikke studioctl, og klarte ikke å installere "
                          "den. Sjekk nettverk, eller bygg containeren på nytt.")
                await mark("studioctl", "fail", detail)
                await skip_rest("studioctl", "studioctl mangler")
                result["summary"] = detail
                self._persist(job, result, detail)
                return result
            version = await self._studioctl_version(job, "studioctl")
            await mark("studioctl", "ok", f"Installert ({version})")
        else:
            await mark("studioctl", "ok", f"Installert ({version})")

        # 2 — is it the newest release? Update if not.
        await mark("studioctl_version", "running", "Sjekker nyeste utgivelse")
        latest = await self._latest_studioctl_tag()
        if not latest:
            await mark("studioctl_version", "warn",
                       f"Fant ikke nyeste versjon på GitHub. Fortsetter med "
                       f"{version}.")
        elif latest == version:
            await mark("studioctl_version", "ok", f"{version} er nyeste versjon")
        elif not self.s.studioctl_auto_update:
            await mark("studioctl_version", "warn",
                       f"{version} er installert, {latest} er tilgjengelig. "
                       "Automatisk oppdatering er slått av.")
        else:
            await mark("studioctl_version", "running",
                       f"Oppdaterer fra {version} til {latest}")
            rc, out = await self._run(job, ["studioctl", "self", "update"],
                                      None, 300, "studioctl_version")
            now = await self._studioctl_version(job, "studioctl_version")
            if rc == 0 and now == latest:
                await mark("studioctl_version", "ok", f"Oppdatert til {now}")
            else:
                # Not fatal: an older studioctl still upgrades apps.
                await mark("studioctl_version", "warn",
                           f"Kunne ikke oppdatere til {latest}. Fortsetter "
                           f"med {now or version}.")
                version = now or version
        result["studioctl_version"] = version

        # 2 — find the repo, then clone it
        await mark("clone", "running", "Slår opp hvilken Studio-instans "
                                       "appen ligger på")
        base, why = await self.resolve_host(org, app)
        if not base:
            await mark("clone", "fail", why)
            await skip_rest("clone", "appen ble ikke funnet")
            result["summary"] = why
            self._persist(job, result, why)
            return result
        result["studio"] = base
        target, branch = await self.prepare_worktree(job, org, app, base)
        if target is None:
            await mark("clone", "fail", "Kunne ikke klone appen.")
            await skip_rest("clone", "appen ble ikke hentet")
            result["summary"] = "Kunne ikke klone appen."
            self._persist(job, result, "")
            return result
        result["branch"] = branch
        await mark("clone", "ok", f"Hentet fra {why} på «{branch}»")

        # 3 — preflight
        await mark("preflight", "running")
        csproj = target / "App" / "App.csproj"
        pre = preflight(csproj)
        result["from_version"] = pre.version
        if not pre.eligible:
            await mark("preflight", "fail", pre.reasons[0], pre.reasons)
            await skip_rest("preflight", "appen kan ikke oppgraderes")
            result["outcome"] = "rejected"
            result["summary"] = pre.reasons[0]
            self._persist(job, result, "\n".join(pre.reasons))
            return result
        await mark("preflight", "warn" if pre.warnings else "ok",
                   f"Appen står på {pre.version}", pre.warnings)

        # 4 — upgrade
        await mark("upgrade", "running", f"Migrerer fra {pre.version} til v9")
        rc, log_text = await self._run(
            job, ["studioctl", "app", "upgrade", "v9", "-p", str(target)],
            None, UPGRADE_TIMEOUT, "upgrade")
        log_parts.append(log_text)
        outcome = "failed" if rc == 124 else classify(log_text, rc)
        result["exit_code"] = rc
        result["outcome"] = outcome
        result["manual"] = manual_items(log_text) if outcome == "manual" else []
        result["to_version"] = _strip_range(
            read_package_versions(csproj).get("Altinn.App.Api", ""))

        _, changed_out = await self._run(
            job, ["git", "status", "--porcelain"], target, 60, "upgrade")
        result["files_changed"] = len([l for l in changed_out.splitlines() if l.strip()])

        if outcome == "failed":
            await mark("upgrade", "fail", "Migreringen feilet.")
            await skip_rest("upgrade", "migreringen feilet")
            result["summary"] = "Migreringen feilet."
            self._persist(job, result, "\n".join(log_parts))
            return result
        if outcome == "rejected":
            await mark("upgrade", "fail", "studioctls versjonssjekk avviste appen.")
            await skip_rest("upgrade", "appen ble avvist")
            result["summary"] = "studioctls versjonssjekk avviste appen."
            self._persist(job, result, "\n".join(log_parts))
            return result
        await mark(
            "upgrade",
            "warn" if result["manual"] else "ok",
            f"Oppgradert til {result['to_version'] or 'v9'} "
            f"({result['files_changed']} filer endret)",
            result["manual"])

        # 5 — build
        await mark("build", "running", "Kompilerer med dotnet build")
        build_ok, build_errors = await self._build(job, target)
        result["build_ok"] = build_ok
        result["build_errors"] = build_errors if build_ok is False else []
        if build_ok is None:
            await mark("build", "skipped", build_errors[0])
        else:
            await mark("build", "ok" if build_ok else "warn",
                       "Appen kompilerer" if build_ok else
                       f"{len(build_errors)} kompileringsfeil må rettes",
                       build_errors)

        # 6 — publish
        result["summary"] = self._summary(result)
        await self._publish(job, result, target, mark)

        result["duration_s"] = round(time.time() - t0, 1)
        self._persist(job, result, "\n".join(log_parts))
        return result

    def _summary(self, r: dict) -> str:
        if r["build_ok"] and not r["manual"]:
            return (f"Oppgradert til {r['to_version'] or 'v9'} og appen "
                    f"kompilerer. Ingenting gjenstår.")
        parts = []
        if r["manual"]:
            parts.append(f"{len(r['manual'])} ting må portes for hånd")
        if r["build_ok"] is False:
            parts.append(f"{len(r['build_errors'])} kompileringsfeil")
        return (f"Oppgradert til {r['to_version'] or 'v9'}, men "
                + " og ".join(parts) + ".")

    async def _publish(self, job: Job, result: dict, target: Path, mark) -> None:
        """Branch, commit, push, open a PR — but only when writing is enabled.

        The switch is off by default and cannot be flipped from the UI. With it
        off the step reports `skipped` and explains why, so the run still ends
        somewhere sensible instead of looking broken.
        """
        if not self.s.allow_gitea_write:
            await mark("publish", "skipped",
                       "Oppretting av pull requests er slått av under "
                       "Konfigurasjon. Endringene ligger klare i "
                       "arbeidskopien.")
            return

        # The switches say yes; the server has the final word. Checking first
        # turns a confusing push rejection into a clear message.
        base = result["studio"]
        _, token = self.s.studio_credentials(base)
        scopes, scope_err = await token_scopes(base, token)
        if scope_err:
            await mark("publish", "fail",
                       f"Kunne ikke bekrefte hva tokenet har tilgang til: "
                       f"{scope_err}")
            return
        if write_capability(scopes) == "no":
            await mark("publish", "skipped",
                       f"Tokenet har kun {', '.join(scopes)} — det kan lese, "
                       "men ikke opprette pull requests. Endringene ligger "
                       "klare i arbeidskopien.")
            return

        org, app = result["org"], result["app"]
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        head = f"upgrade/v9-{stamp}"
        await mark("publish", "running", f"Oppretter «{head}»")

        for argv in (
            ["git", "-C", str(target), "checkout", "-q", "-b", head],
            ["git", "-C", str(target), "add", "-A"],
            ["git", "-C", str(target), "-c", "user.name=Altinn Fleet",
             "-c", "user.email=fleet@altinn.no", "commit", "-q",
             "-m", f"Oppgrader til Altinn.App v9\n\n"
                   f"Generert av Altinn Fleet med studioctl app upgrade v9.\n"
                   f"Fra {result['from_version']} til {result['to_version']}."],
        ):
            rc, out = await self._run(job, argv, None, 120, "publish")
            if rc != 0:
                await mark("publish", "fail", self._redact(out)[-300:])
                return

        user, token = self.s.studio_credentials(base)
        push_url = inject_credentials(
            base, f"/repos/{org}/{app}.git", user, token)
        rc, out = await self._run(
            job, ["git", "-C", str(target), "push", "-q", push_url,
                  f"HEAD:refs/heads/{head}"], None, 300, "publish")
        if rc != 0:
            await mark("publish", "fail",
                       f"Kunne ikke pushe branchen: {self._redact(out)[-300:]}")
            return

        pr_url = await self._create_pr(job, org, app, head,
                                       result["branch"], base, result)
        if pr_url:
            result["pr_url"] = pr_url
            await mark("publish", "ok", f"Pull request opprettet: {pr_url}")
        else:
            await mark("publish", "warn",
                       f"Branchen «{head}» er pushet, men PR-en ble ikke "
                       "opprettet. Opprett den manuelt i Altinn Studio.")

    async def _create_pr(self, job: Job, org: str, app: str, head: str,
                         target_branch: str, base: str,
                         result: dict) -> Optional[str]:
        import httpx
        _, token = self.s.studio_credentials(base)
        api = f"{base}/repos/api/v1/repos/{org}/{app}/pulls"
        payload = {
            "head": head,
            "base": target_branch,
            "title": f"Oppgrader til Altinn.App v9 ({result['to_version'] or 'v9'})",
            "body": pr_body(result),
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    api, json=payload,
                    headers={"Authorization": f"token {token}"})
            if resp.status_code in (200, 201):
                return resp.json().get("html_url") or ""
            await job.emit({"kind": "error", "step": "publish",
                            "message": f"Gitea svarte {resp.status_code}: "
                                       f"{resp.text[:200]}"})
        except Exception as e:
            await job.emit({"kind": "error", "step": "publish",
                            "message": f"Kunne ikke nå Gitea-API-et: {e}"})
        return None

    def _persist(self, job: Job, result: dict, log_text: str) -> None:
        """Write the durable record. In-memory jobs are pruned; this is not."""
        try:
            with get_conn(self.s.db_path) as conn:
                cur = conn.execute(
                    """INSERT INTO upgrade_runs
                       (job_id, app_id, org, app_name, started_at, finished_at,
                        from_version, to_version, outcome, exit_code,
                        files_changed, manual_items, branch, pr_url,
                        build_ok, build_errors, steps, log)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (job.id, result["app_id"], result["org"], result["app"],
                     result["started_at"],
                     datetime.now(timezone.utc).isoformat(timespec="seconds"),
                     result["from_version"], result["to_version"],
                     result["outcome"], result["exit_code"],
                     result["files_changed"], json.dumps(result["manual"]),
                     result["branch"], result.get("pr_url"),
                     (None if result.get("build_ok") is None
                      else int(result["build_ok"])),
                     json.dumps(result.get("build_errors") or []),
                     json.dumps(result.get("steps") or {}),
                     log_text[-200000:]),
                )
                job.run_id = cur.lastrowid
                result["run_id"] = cur.lastrowid
        except Exception as e:  # a failed write must not lose the job result
            result.setdefault("persist_error", str(e))


def pr_body(result: dict) -> str:
    """The pull request description.

    This is where the work that could not be automated goes. A reviewer should
    be able to open the PR and see, as checkboxes, exactly what remains — the
    APIs studioctl says must be hand-ported, and every compiler error the build
    produced. Nothing is left implicit in a log the reviewer has to go find.
    """
    manual = result.get("manual") or []
    errors = result.get("build_errors") or []
    build_ok = result.get("build_ok")

    L: list[str] = []
    L.append(f"Oppgradert fra Altinn.App **{result.get('from_version') or '8.x'}** "
             f"til **{result.get('to_version') or 'v9'}** med "
             "`studioctl app upgrade v9`, kjørt fra Altinn Fleet.")
    L.append("")

    if build_ok is True and not manual:
        L.append("Appen kompilerer, og migreringen fant ingenting som må gjøres "
                 "for hånd. Denne PR-en burde være klar til gjennomgang.")
    elif build_ok is True:
        L.append("Appen kompilerer, men noe må fortsatt gjøres for hånd — se under.")
    elif build_ok is False:
        L.append("> [!WARNING]")
        L.append("> **Appen kompilerer ikke slik den står.** Punktene under må "
                 "rettes før denne PR-en kan slås sammen.")
    L.append("")

    if manual:
        L.append(f"## Må portes for hånd ({len(manual)})")
        L.append("")
        for item in manual:
            L.append(f"- [ ] {item}")
        L.append("")

    if errors:
        L.append(f"## Kompileringsfeil ({len(errors)})")
        L.append("")
        L.append("Fra `dotnet build -c Release` etter oppgraderingen:")
        L.append("")
        for e in errors:
            L.append(f"- [ ] `{e}`")
        L.append("")

    L.append("## Før sammenslåing")
    L.append("")
    L.append("- [ ] Appen bygger lokalt")
    L.append("- [ ] Prosessflyten er testet ende til ende")
    L.append("- [ ] Endringene i `App/App.csproj` og `Dockerfile` er gjennomgått")
    if manual:
        L.append("- [ ] Alle punktene over er håndtert")
    L.append("")
    L.append(f"<sub>{result.get('files_changed', 0)} filer endret. "
             "Generert av Altinn Fleet — se kjøringen der for full logg.</sub>")
    return "\n".join(L)


async def token_scopes(base: str, token: str) -> tuple[list[str], str]:
    """Ask Gitea what the token is actually allowed to do.

    Gitea names the granted scopes in the rejection it sends when you call an
    endpoint outside them. So we deliberately call one we never need — the
    notifications endpoint — and read the scope list out of the 403 body:

        token does not have at least one of required scope(s),
        required=[read:notification], token scope=read:organization,read:repository

    This is the authoritative answer. Application-level switches can be edited;
    the scope is enforced on the server and cannot be talked around. Returns
    (scopes, error). A pure GET that gets refused — nothing is written.
    """
    import httpx
    if not token:
        return [], "Ingen token er konfigurert."
    url = f"{base}/repos/api/v1/notifications"
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(url, headers={"Authorization": f"token {token}"})
    except Exception as e:
        return [], f"Fikk ikke kontakt med {base}: {e}"

    m = re.search(r"token scope=([^\"]+)", r.text)
    if m:
        return [s.strip() for s in m.group(1).split(",") if s.strip()], ""
    if r.status_code == 200:
        # The probe endpoint was inside the token's scope, so Gitea had no
        # reason to list the scopes. That means the token is broad — not that
        # something is wrong. Report "unknown" and let the server decide when
        # we actually push; refusing here would block a perfectly good token.
        return [], ""
    if r.status_code == 401:
        return [], "Tokenet ble avvist av Gitea (401). Er det utløpt?"
    return [], f"Kunne ikke lese scope (HTTP {r.status_code})."


def write_capability(scopes: list[str]) -> str:
    """'yes' | 'no' | 'unknown'.

    An empty scope list means Gitea never told us — the token was broad enough
    that the probe succeeded. That is not the same as "cannot write", and
    treating it as such locks out exactly the tokens that do have access.
    """
    if not scopes:
        return "unknown"
    return "yes" if any(s in ("write:repository", "all") for s in scopes) else "no"


def can_write(scopes: list[str]) -> bool:
    """Kept for callers that just want a boolean; unknown counts as allowed,
    because the server rejects the push if it is not."""
    return write_capability(scopes) != "no"
