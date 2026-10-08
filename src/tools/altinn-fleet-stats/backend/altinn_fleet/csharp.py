"""Find Altinn interface usage in an app's own C# code.

Apps extend the Altinn app runtime by implementing interfaces from the
`Altinn.App.*` libraries and registering them in `Program.cs`. This module reads
the app's C# source and records three kinds of usage:

- `implements` — a type in the app has the interface in its base list, or extends a
                library base class that implements it (`GenericFormDataValidator<T>`)
- `registers` — the interface appears in a DI registration (`AddTransient<IFoo, Bar>()`)
- `injects`   — the interface is used as a type: constructor parameter, field, or
                a `GetRequiredService<IFoo>()` lookup

Parsing is regex-based over source with comments and string literals removed. That
is deliberate: apps in the wild span every library version back to the first Altinn 3
release and do not compile in this container, so a tolerant reader that never throws
beats an exact one that only handles current code.
"""

from __future__ import annotations

import re
from pathlib import Path

# Directories that hold build output or vendored code rather than app code.
SKIPPED_DIRS = {"obj", "bin", "node_modules", ".git", "wwwroot"}

# Generated sources carry no app intent.
SKIPPED_SUFFIXES = (".g.cs", ".generated.cs", ".designer.cs", ".assemblyinfo.cs")

MAX_FILE_BYTES = 2_000_000

# `class Foo<T>(IDep dep) : Base, IBar` — the base list runs to `{`, `;` or `where`.
TYPE_DECL_RE = re.compile(
    r"\b(?:class|record|struct)\s+(?P<name>\w+)"
    r"(?:\s*<[^<>{};]*>)?"
    r"(?:\s*\([^()]*\))?"
    r"\s*:\s*(?P<bases>[^{};]+?)(?=\{|;|\bwhere\b)"
)

INTERFACE_DECL_RE = re.compile(r"\binterface\s+(?P<name>I\w+)")

# services.AddTransient<IFoo, Bar>() / AddSingleton<IFoo>() / AddScoped<IFoo>(...)
DI_GENERIC_RE = re.compile(
    r"\bAdd(?:Transient|Scoped|Singleton)\s*<\s*(?P<iface>[\w.]+)\s*[,>]"
)
# services.AddTransient(typeof(IFoo), typeof(Bar))
DI_TYPEOF_RE = re.compile(
    r"\bAdd(?:Transient|Scoped|Singleton)\s*\(\s*typeof\s*\(\s*(?P<iface>[\w.]+)\s*\)"
)
# sp.GetRequiredService<IFoo>()
SERVICE_LOOKUP_RE = re.compile(
    r"\bGet(?:Required)?Service\s*<\s*(?P<iface>[\w.]+)\s*>"
)
# `IFoo foo` / `IFoo? _foo` — an interface used as the type of something
TYPED_USE_RE = re.compile(r"\b(?P<iface>I[A-Z]\w*)\??\s+@?(?P<ident>[a-z_]\w*)\b")

INTERFACE_NAME_RE = re.compile(r"^I[A-Z]\w*$")

# .NET and ASP.NET interfaces every app touches through the standard `Program.cs`.
# Recognising them keeps the "not in the catalog" list about Altinn interfaces —
# where an entry means either an app-local abstraction or one the library has
# since removed, both of which are worth reading.
DOTNET_INTERFACES = frozenset(
    {
        "IApplicationBuilder", "IAsyncDisposable", "IAsyncEnumerable", "IAsyncEnumerator",
        "IAuthorizationHandler", "IAuthorizationRequirement", "IAuthorizationService",
        "IChangeToken", "IClaimsTransformation", "ICloneable", "ICollection", "IComparable",
        "IComparer", "IConfiguration", "IConfigurationBuilder", "IConfigurationRoot",
        "IConfigurationSection", "IConvertible", "IDataProtectionProvider", "IDictionary",
        "IDisposable", "IDistributedCache", "IEndpointRouteBuilder", "IEnumerable",
        "IEnumerator", "IEqualityComparer", "IEquatable", "IExceptionFilter", "IFileProvider",
        "IFormCollection", "IFormFile", "IFormatProvider", "IGrouping", "IHost",
        "IHostApplicationLifetime", "IHostBuilder", "IHostEnvironment", "IHostedService",
        "IHttpClientFactory", "IHttpContextAccessor", "IList", "ILogger", "ILoggerFactory",
        "ILoggerProvider", "IMemoryCache", "IMiddleware", "IModelBinder", "IMvcBuilder",
        "INotifyPropertyChanged", "IOptions", "IOptionsMonitor", "IOptionsSnapshot",
        "IPrincipal", "IProgress", "IQueryable", "IReadOnlyCollection", "IReadOnlyDictionary",
        "IReadOnlyList", "IResult", "ISerializable", "IServiceCollection", "IServiceProvider",
        "IServiceScope", "IServiceScopeFactory", "ISet", "IStartupFilter", "IStringLocalizer",
        "IUrlHelper", "IValidatableObject", "IWebHost", "IWebHostBuilder", "IWebHostEnvironment",
        "IXmlSerializable", "IActionResult", "IIdentity", "IAuthenticationService",
        # Not interfaces at all, but they match the I-prefix naming rule below
        # and would otherwise look like unknown Altinn interfaces.
        "IOException", "IPAddress", "IPEndPoint", "IPHostEntry", "IPStatus",
        "IPGlobalProperties", "IOControlCode",
    }
)

# Reserved words that `TYPED_USE_RE` could otherwise read as a variable name.
_KEYWORDS_AFTER_TYPE = {
    "is", "as", "in", "out", "ref", "new", "return", "when", "where", "and", "or",
    "not", "select", "from", "into", "on", "by", "await", "case", "do", "else",
}


def _strip_code(text: str) -> str:
    """Remove comments and string/char literals, keeping offsets roughly intact.

    Everything removed is replaced by spaces of the same length so line structure
    and declaration spacing survive.
    """
    out: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if ch == "/" and nxt == "/":
            end = text.find("\n", i)
            end = n if end == -1 else end
            out.append(" " * (end - i))
            i = end
            continue

        if ch == "/" and nxt == "*":
            end = text.find("*/", i + 2)
            end = n if end == -1 else end + 2
            out.append(" " if "\n" not in text[i:end] else "\n")
            out.append(" " * max(0, end - i - 1))
            i = end
            continue

        # Raw string literal: """ ... """
        if text.startswith('"""', i):
            end = text.find('"""', i + 3)
            end = n if end == -1 else end + 3
            out.append(" " * (end - i))
            i = end
            continue

        # Verbatim string: @"..." (doubled quotes escape)
        if ch == "@" and nxt == '"' or (ch in "$@" and text.startswith('@"', i + 1)):
            start = text.index('"', i)
            j = start + 1
            while j < n:
                if text[j] == '"':
                    if j + 1 < n and text[j + 1] == '"':
                        j += 2
                        continue
                    j += 1
                    break
                j += 1
            out.append(" " * (j - i))
            i = j
            continue

        if ch in "\"'":
            j = i + 1
            while j < n:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == ch:
                    j += 1
                    break
                if text[j] == "\n":
                    break
                j += 1
            out.append(" " * (j - i))
            i = j
            continue

        out.append(ch)
        i += 1

    return "".join(out)


def _simple_name(type_name: str) -> str:
    """`Altinn.App.Core.Features.IDataProcessor<T>` -> `IDataProcessor`."""
    name = type_name.split("<")[0].strip()
    return name.rsplit(".", 1)[-1]


def _split_bases(base_list: str) -> list[str]:
    """Split a base list on commas that are not inside generic brackets."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in base_list:
        if ch in "<([":
            depth += 1
        elif ch in ">)]":
            depth -= 1
        if ch == "," and depth <= 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return [p.strip() for p in parts if p.strip()]


def _iter_source_files(app_dir: Path):
    root = app_dir / "App"
    if not root.exists():
        return
    for path in sorted(root.rglob("*.cs")):
        if any(part in SKIPPED_DIRS for part in path.parts):
            continue
        if path.name.lower().endswith(SKIPPED_SUFFIXES):
            continue
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                continue
            yield path, path.read_text(encoding="utf-8-sig", errors="replace")
        except OSError:
            continue


def scan_app_code(
    app_dir: Path,
    catalog_names: set[str],
    base_classes: dict[str, tuple[str, ...]] | None = None,
) -> dict:
    """Return interface usage for one app.

    `catalog_names` is the set of interface names the current library exposes and
    `base_classes` maps the library's own classes to the interfaces they implement,
    so an app that extends one of them is counted as an implementer too.

    `catalog_names` decides each usage's `origin`:

    - `altinn`  — the interface is in the library's public API
    - `app`     — the app declares the interface itself
    - `dotnet`  — a .NET or ASP.NET interface
    - `unknown` — none of those: a third-party interface, or an Altinn one the
                  library has since removed (which is worth seeing)
    """
    usages: dict[tuple[str, str, str, str], dict] = {}
    app_interfaces: set[str] = set()
    file_count = 0
    sources: list[tuple[str, str]] = []

    for path, raw in _iter_source_files(app_dir):
        file_count += 1
        code = _strip_code(raw)
        rel = path.relative_to(app_dir).as_posix()
        sources.append((rel, code))
        for match in INTERFACE_DECL_RE.finditer(code):
            app_interfaces.add(match.group("name"))

    base_classes = base_classes or {}

    def add(name: str, kind: str, rel: str, owner: str, via: str = "") -> None:
        if not INTERFACE_NAME_RE.match(name):
            return
        key = (name, kind, rel, owner)
        if key in usages:
            return
        usages[key] = {
            "interface_name": name,
            "usage_kind": kind,
            "file_path": rel,
            "class_name": owner,
            "via": via,
            "origin": (
                "altinn"
                if name in catalog_names
                else "app"
                if name in app_interfaces
                else "dotnet"
                if name in DOTNET_INTERFACES
                else "unknown"
            ),
        }

    for rel, code in sources:
        for match in TYPE_DECL_RE.finditer(code):
            owner = match.group("name")
            for base in _split_bases(match.group("bases")):
                base_name = _simple_name(base)
                add(base_name, "implements", rel, owner)
                # Extending a library base class implements its interfaces too
                for inherited in base_classes.get(base_name, ()):
                    add(inherited, "implements", rel, owner, via=base_name)

        for pattern in (DI_GENERIC_RE, DI_TYPEOF_RE):
            for match in pattern.finditer(code):
                add(_simple_name(match.group("iface")), "registers", rel, "")

        for match in SERVICE_LOOKUP_RE.finditer(code):
            add(_simple_name(match.group("iface")), "injects", rel, "")

        for match in TYPED_USE_RE.finditer(code):
            if match.group("ident") in _KEYWORDS_AFTER_TYPE:
                continue
            add(match.group("iface"), "injects", rel, "")

    # An interface the app implements or registers is not also "just injected".
    strong = {
        (u["interface_name"])
        for u in usages.values()
        if u["usage_kind"] in ("implements", "registers")
    }
    records = [
        u
        for u in usages.values()
        if not (u["usage_kind"] == "injects" and u["interface_name"] in strong)
    ]

    implemented_altinn = {
        u["interface_name"]
        for u in records
        if u["usage_kind"] == "implements" and u["origin"] == "altinn"
    }

    return {
        "usages": records,
        "cs_file_count": file_count,
        "app_interface_count": len(app_interfaces),
        "implemented_interface_count": len(implemented_altinn),
    }
