#!/usr/bin/env python3
"""Generate the Altinn.App public-interface catalog used by the fleet dashboard.

The catalog answers "which public interfaces does the app library expose?" so the
scanner can answer "and how many apps out there actually use them?".

Two sources, both inside this monorepo:

1. `test/<assembly>.Tests/PublicApiTests.PublicApi_ShouldNotChange_Unintentionally.verified.txt`
   — the committed public-API snapshots. Authoritative for *what is public*: every
   interface, its members, and its `[Obsolete]` marking.
2. The library source under `src/` — for the XML `<summary>` doc comment and for the
   internal `[ImplementableByApps]` attribute, which marks the interfaces apps are
   meant to implement themselves. Neither survives into the snapshot.

The result is written to `altinn_fleet/data/interface_catalog.json`, which is committed
and shipped inside the container: the dashboard must work without the library checked
out next to it. Re-run this script when the library's public API changes.

Usage:
    python3 backend/scripts/generate_interface_catalog.py [--repo PATH] [--out PATH] [--check]
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Assemblies whose public API we track, and where their snapshot lives.
ASSEMBLIES = {
    "Altinn.App.Core": "test/Altinn.App.Core.Tests",
    "Altinn.App.Api": "test/Altinn.App.Api.Tests",
    "Altinn.App.Clients.Fiks": "test/Altinn.App.Clients.Fiks.Tests",
}

SNAPSHOT_NAME = "PublicApiTests.PublicApi_ShouldNotChange_Unintentionally.verified.txt"

# Path of the app backend libraries relative to the repository root.
LIB_ROOT = "src/App/backend"

IFACE_RE = re.compile(r"^    public interface (?P<name>I\w+)(?:<[^>]*>)?(?P<rest>.*)$")
CLASS_RE = re.compile(
    r"^    public (?:abstract |sealed |static |partial |unsafe )*class (?P<name>\w+)"
    r"(?:<[^>]*>)?\s*:\s*(?P<bases>.+?)(?:\s*\{.*)?$"
)
NAMESPACE_RE = re.compile(r"^namespace (?P<ns>\S+)")
ATTR_RE = re.compile(r"^    \[(?P<body>.*)$")
OBSOLETE_RE = re.compile(r'^System\.Obsolete\("(?P<message>.*)"(?:,.*)?\)$', re.DOTALL)

SRC_IFACE_DECL_RE = re.compile(r"^[ \t]*public\s+interface\s+(?P<name>I\w+)")
SRC_NAMESPACE_RE = re.compile(r"^\s*namespace\s+(?P<ns>[\w.]+)", re.MULTILINE)
SUMMARY_RE = re.compile(r"<summary>(?P<body>.*?)</summary>", re.DOTALL)
DOC_TAG_RE = re.compile(r"<[^>]+>")
# `<see cref="T:Altinn.App.Core.Features.IDataProcessor"/>` reads as "IDataProcessor"
DOC_REF_RE = re.compile(r"""<(?:see|seealso)\s+cref=["'](?:[A-Z]:)?(?P<ref>[^"']+)["']\s*/?>""")
DOC_PARAMREF_RE = re.compile(r"""<(?:paramref|typeparamref)\s+name=["'](?P<ref>[^"']+)["']\s*/?>""")
QUALIFIER_RE = re.compile(r"\b(?:[A-Za-z_]\w*\.)+([A-Z]\w*)")


def _run_git(repo: Path, *args: str) -> str:
    try:
        out = subprocess.run(
            ["git", *args], cwd=repo, capture_output=True, text=True, timeout=30
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return out.stdout.strip() if out.returncode == 0 else ""


def _shorten(signature: str) -> str:
    """Drop namespace qualifiers so a signature reads like documentation."""
    return QUALIFIER_RE.sub(r"\1", signature)


def _join_attribute(lines: list[str]) -> str:
    """Collapse a (possibly multi-line, string-concatenated) attribute into one string."""
    body = " ".join(line.strip() for line in lines)
    body = body.rstrip("]")
    # PublicApiGenerator wraps long strings as `"part one" + "part two"`
    body = re.sub(r'"\s*\+\s*"', "", body)
    return body


def parse_snapshot(path: Path, assembly: str,
                   classes: dict[str, list[str]] | None = None) -> list[dict]:
    """Parse one PublicApiGenerator snapshot into interface records.

    When `classes` is given, every public class is recorded there as
    name -> base types, so base classes that implement an interface on an app's
    behalf can be resolved afterwards.
    """
    interfaces: list[dict] = []
    namespace = ""
    pending_attrs: list[str] = []
    attr_buffer: list[str] = []

    lines = path.read_text(encoding="utf-8-sig").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        ns_match = NAMESPACE_RE.match(line)
        if ns_match:
            namespace = ns_match.group("ns")
            pending_attrs = []
            i += 1
            continue

        if attr_buffer:
            attr_buffer.append(line)
            if line.rstrip().endswith("]"):
                pending_attrs.append(_join_attribute(attr_buffer))
                attr_buffer = []
            i += 1
            continue

        attr_match = ATTR_RE.match(line)
        if attr_match:
            if line.rstrip().endswith("]"):
                pending_attrs.append(_join_attribute([attr_match.group("body")]))
            else:
                attr_buffer = [attr_match.group("body")]
            i += 1
            continue

        if classes is not None:
            class_match = CLASS_RE.match(line)
            if class_match:
                classes[class_match.group("name")] = [
                    _simple_type(b) for b in _split_top_level(class_match.group("bases"))
                ]

        iface_match = IFACE_RE.match(line)
        if not iface_match:
            if line.strip() and not line.startswith("        "):
                pending_attrs = []
            i += 1
            continue

        name = iface_match.group("name")
        rest = iface_match.group("rest").strip()
        bases: list[str] = []
        if rest.startswith(":"):
            base_part = rest[1:].split("{")[0]
            bases = [_shorten(b.strip()) for b in _split_top_level(base_part) if b.strip()]

        members: list[str] = []
        if not rest.endswith("{ }"):
            i += 1  # the "    {" line
            i += 1
            while i < len(lines) and lines[i] != "    }":
                member = lines[i].strip()
                if member and not member.startswith("["):
                    members.append(_shorten(member))
                i += 1

        obsolete_message = ""
        is_obsolete = False
        for attr in pending_attrs:
            match = OBSOLETE_RE.match(attr)
            if attr.startswith("System.Obsolete"):
                is_obsolete = True
                obsolete_message = match.group("message") if match else ""

        interfaces.append(
            {
                "name": name,
                "full_name": f"{namespace}.{name}",
                "namespace": namespace,
                "assembly": assembly,
                "base_interfaces": bases,
                "members": members,
                "member_count": len(members),
                "is_obsolete": is_obsolete,
                "obsolete_message": obsolete_message,
            }
        )
        pending_attrs = []
        i += 1

    return interfaces


def _simple_type(type_name: str) -> str:
    """`Altinn.App.Core.Features.Validation.GenericFormDataValidator<T>` -> the bare name."""
    return type_name.split("<")[0].strip().rsplit(".", 1)[-1]


def resolve_base_classes(classes: dict[str, list[str]],
                         interface_names: set[str]) -> dict[str, list[str]]:
    """Map each library class to the catalog interfaces it implements.

    Apps routinely extend a base class the library ships — `GenericFormDataValidator<T>`
    rather than `IFormDataValidator` directly — and that still makes the app an
    implementer. Resolution follows base classes transitively, so a class two
    levels down still reports the interface it ultimately provides.
    """
    resolved: dict[str, list[str]] = {}

    def walk(name: str, seen: frozenset[str]) -> set[str]:
        if name in resolved:
            return set(resolved[name])
        if name in seen or name not in classes:
            return set()
        found: set[str] = set()
        for base in classes[name]:
            if base in interface_names:
                found.add(base)
            else:
                found |= walk(base, seen | {name})
        resolved[name] = sorted(found)
        return found

    for name in classes:
        walk(name, frozenset())
    return {name: ifaces for name, ifaces in resolved.items() if ifaces}


def _split_top_level(text: str) -> list[str]:
    """Split on commas that are not inside generic brackets."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in text:
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return parts


def _summary_from_doc(doc_lines: list[str]) -> str:
    """Turn an XML doc comment block into one plain-text paragraph."""
    text = "\n".join(re.sub(r"^\s*///\s?", "", line) for line in doc_lines)
    match = SUMMARY_RE.search(text)
    if not match:
        return ""
    body = match.group("body")
    body = DOC_REF_RE.sub(lambda m: m.group("ref").rsplit(".", 1)[-1], body)
    body = DOC_PARAMREF_RE.sub(lambda m: m.group("ref"), body)
    body = DOC_TAG_RE.sub("", body)
    return " ".join(html.unescape(body).split())


def _preceding_block(lines: list[str], index: int) -> list[str]:
    """Return the contiguous non-blank lines directly above `index`.

    Doc comments and attributes sit in one unbroken block above a declaration, and
    attributes are regularly wrapped across several lines — walking back to the first
    blank line captures the whole block regardless of how it is formatted.
    """
    start = index
    while start > 0 and lines[start - 1].strip():
        start -= 1
    return lines[start:index]


def scan_source(lib_root: Path) -> dict[str, dict]:
    """Collect per-interface source facts: summary, source path, app-implementable."""
    facts: dict[str, dict] = {}
    for cs_file in sorted((lib_root / "src").rglob("*.cs")):
        posix = cs_file.as_posix()
        if "/obj/" in posix or "/bin/" in posix:
            continue
        try:
            text = cs_file.read_text(encoding="utf-8-sig", errors="replace")
        except OSError:
            continue
        if "public interface" not in text:
            continue
        ns_match = SRC_NAMESPACE_RE.search(text)
        namespace = ns_match.group("ns") if ns_match else ""
        lines = text.splitlines()
        for index, line in enumerate(lines):
            decl = SRC_IFACE_DECL_RE.match(line)
            if not decl:
                continue
            block = _preceding_block(lines, index)
            doc_lines = [b for b in block if b.lstrip().startswith("///")]
            attr_lines = [b for b in block if not b.lstrip().startswith("///")]
            facts.setdefault(
                f"{namespace}.{decl.group('name')}",
                {
                    "summary": _summary_from_doc(doc_lines),
                    "implementable_by_apps": any(
                        "ImplementableByApps" in a for a in attr_lines
                    ),
                    "source_path": posix,
                },
            )
    return facts


# Namespace segments that name a container rather than a subject area.
_CONTAINER_SEGMENTS = {"interface", "interfaces", "configuration", "builder"}


def derive_area(namespace: str, assembly: str) -> tuple[str, str]:
    """Return (area, group) — the two levels the dashboard groups interfaces by."""
    if assembly == "Altinn.App.Clients.Fiks":
        segments = [s for s in namespace[len(assembly) :].strip(".").split(".") if s]
        area, group = "Fiks", (segments[0] if segments else "Fiks")
    else:
        prefix = f"{assembly}."
        remainder = namespace[len(prefix) :] if namespace.startswith(prefix) else namespace
        segments = [s for s in remainder.split(".") if s]
        if not segments:
            return ("Root", "Root")
        area = segments[0]
        group = segments[1] if len(segments) > 1 else segments[0]

    # `Altinn.App.Core.EFormidling.Interface` groups nothing useful under
    # "Interface" — fall back to the area for container-word segments.
    if group.lower() in _CONTAINER_SEGMENTS:
        group = area
    return (area, group)


def build_catalog(repo_root: Path) -> dict:
    lib_root = repo_root / LIB_ROOT
    if not lib_root.exists():
        raise SystemExit(f"No app backend libraries at {lib_root}")

    source_facts = scan_source(lib_root)

    interfaces: list[dict] = []
    snapshots: list[str] = []
    classes: dict[str, list[str]] = {}
    for assembly, test_dir in ASSEMBLIES.items():
        snapshot = lib_root / test_dir / SNAPSHOT_NAME
        if not snapshot.exists():
            raise SystemExit(f"Missing public API snapshot: {snapshot}")
        snapshots.append(snapshot.relative_to(repo_root).as_posix())
        for record in parse_snapshot(snapshot, assembly, classes):
            facts = source_facts.get(record["full_name"], {})
            area, group = derive_area(record["namespace"], assembly)
            source_path = facts.get("source_path", "")
            record.update(
                {
                    "area": area,
                    "group": group,
                    "summary": facts.get("summary", ""),
                    "implementable_by_apps": facts.get("implementable_by_apps", False),
                    "source_path": (
                        Path(source_path).relative_to(repo_root).as_posix()
                        if source_path
                        else ""
                    ),
                }
            )
            interfaces.append(record)

    interfaces.sort(key=lambda r: (r["assembly"], r["namespace"], r["name"]))

    version = ""
    changelog = lib_root / "CHANGELOG.md"
    if changelog.exists():
        for line in changelog.read_text(encoding="utf-8").splitlines():
            match = re.match(r"^## \[(?P<v>[^\]]+)\]", line)
            if match and match.group("v").lower() != "unreleased":
                version = match.group("v")
                break

    base_classes = resolve_base_classes(classes, {r["name"] for r in interfaces})

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "commit": _run_git(repo_root, "rev-parse", "HEAD"),
            "commit_date": _run_git(repo_root, "log", "-1", "--format=%cI"),
            "lib_version": version,
            "snapshots": snapshots,
        },
        "interfaces": interfaces,
        "base_classes": dict(sorted(base_classes.items())),
    }


def main() -> int:
    here = Path(__file__).resolve()
    default_repo = here.parents[5]
    default_out = here.parents[1] / "altinn_fleet" / "data" / "interface_catalog.json"

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=default_repo,
                        help="Path to the altinn-studio repository root")
    parser.add_argument("--out", type=Path, default=default_out,
                        help="Where to write the catalog JSON")
    parser.add_argument("--check", action="store_true",
                        help="Fail if the committed catalog is out of date (ignores timestamps)")
    args = parser.parse_args()

    catalog = build_catalog(args.repo.resolve())
    rendered = json.dumps(catalog, indent=2, ensure_ascii=False) + "\n"

    if args.check:
        if not args.out.exists():
            print(f"{args.out} does not exist — run without --check to generate it")
            return 1
        existing = json.loads(args.out.read_text(encoding="utf-8"))
        if (existing.get("interfaces") != catalog["interfaces"]
                or existing.get("base_classes") != catalog["base_classes"]):
            print(f"{args.out} is out of date — regenerate it")
            return 1
        print(f"{args.out} is up to date ({len(catalog['interfaces'])} interfaces)")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(rendered, encoding="utf-8")

    implementable = sum(1 for i in catalog["interfaces"] if i["implementable_by_apps"])
    obsolete = sum(1 for i in catalog["interfaces"] if i["is_obsolete"])
    documented = sum(1 for i in catalog["interfaces"] if i["summary"])
    print(
        f"Wrote {args.out}\n"
        f"  {len(catalog['interfaces'])} public interfaces "
        f"({implementable} implementable by apps, {obsolete} obsolete, {documented} documented)\n"
        f"  {len(catalog['base_classes'])} base classes that implement an interface for an app\n"
        f"  library version {catalog['source']['lib_version'] or 'unknown'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
