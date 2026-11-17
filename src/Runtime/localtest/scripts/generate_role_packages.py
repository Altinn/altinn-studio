"""Generates testdata/authorization/role-packages.json: the access packages Access Management derives from a role.

Source: the static data of Access Management in Altinn/altinn-auth, commit
3d51810374b255aeaa179993e53864d122586a65, directory
src/apps/Altinn.AccessManagement/src/Altinn.AccessMgmt.PersistenceEF:
Data/IngestRolePackage.cs (the RolePackage rows) and Constants/RoleConstants.cs, PackageConstants.cs and
EntityVariantConstants.cs (what the rows refer to).

Only rows with HasAccess = true are kept: the others let a role delegate a package without holding it. A row with
an entity variant applies only when the organization's unit type is that variant's name (such as VPFO).

To regenerate, check out altinn-auth at the commit you want and run, from src/Runtime/localtest:

    python3 -I scripts/generate_role_packages.py <altinn-auth>/src/apps/Altinn.AccessManagement/src/Altinn.AccessMgmt.PersistenceEF

Then update the commit above and in the output's "source".
"""

import json
import re
import sys
from pathlib import Path

SOURCE_COMMIT = "3d51810374b255aeaa179993e53864d122586a65"
OUTPUT = Path(__file__).resolve().parent.parent / "testdata" / "authorization" / "role-packages.json"

DEFINITION = re.compile(
    r"public static ConstantDefinition<(?P<type>\w+)> (?P<name>\w+) \{ get; \} = new ConstantDefinition<\w+>\(\"(?P<id>[0-9a-f-]+)\"\)"
)
ROW = re.compile(r"new RolePackage\(\) \{(?P<fields>[^}]*)\}")
ALIAS = re.compile(r"var (?P<alias>\w+) = (?P<expr>(?:Role|Package)Constants\.\w+)\.Id;")


def definitions(path, type_name):
    """Maps each constant name to the text of its entity block."""
    text = path.read_text(encoding="utf-8-sig")
    matches = [m for m in DEFINITION.finditer(text) if m.group("type") == type_name]
    blocks = {}
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        blocks[match.group("name")] = text[match.end() : end]
    if not blocks:
        sys.exit(f"No {type_name} constants in {path}")
    return blocks


def field(block, name):
    match = re.search(rf"\b{name} = \"(?P<value>[^\"]*)\"", block)
    return match.group("value") if match else None


def resolve(expr, aliases, prefix):
    """Turns `roleDagl`, `RoleConstants.ManagingDirector` or `RoleConstants.ManagingDirector.Id` into the constant name."""
    expr = aliases.get(expr, expr).removesuffix(".Id")
    if not expr.startswith(prefix + "."):
        sys.exit(f"Unexpected reference '{expr}', expected {prefix}.<Name>")
    return expr[len(prefix) + 1 :]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = Path(sys.argv[1])
    roles = definitions(root / "Constants" / "RoleConstants.cs", "Role")
    packages = definitions(root / "Constants" / "PackageConstants.cs", "Package")
    variants = definitions(root / "Constants" / "EntityVariantConstants.cs", "EntityVariant")

    ingest = (root / "Data" / "IngestRolePackage.cs").read_text(encoding="utf-8-sig")
    aliases = {m.group("alias"): m.group("expr") for m in ALIAS.finditer(ingest)}

    # role constant -> (packages for every unit type, unit type -> packages)
    granted = {}
    rows = 0
    for match in ROW.finditer(ingest):
        rows += 1
        fields = dict(
            (key.strip(), value.strip())
            for key, value in (part.split("=", 1) for part in match.group("fields").split(",") if part.strip())
        )
        if fields["HasAccess"] != "true":
            continue

        role = resolve(fields["RoleId"], aliases, "RoleConstants")
        package = resolve(fields["PackageId"], aliases, "PackageConstants")
        if role not in roles or package not in packages:
            sys.exit(f"Unknown role or package in row: {match.group(0)}")
        code = field(packages[package], "Code")
        if field(packages[package], "Urn") != f"urn:altinn:accesspackage:{code}":
            sys.exit(f"Package {package} has code {code} but another URN")

        all_types, by_type = granted.setdefault(role, (set(), {}))
        if fields["EntityVariantId"] == "null":
            all_types.add(code)
        else:
            variant = resolve(fields["EntityVariantId"], {}, "EntityVariantConstants")
            unit_type = field(variants[variant], "Name")
            if unit_type is None:
                sys.exit(f"Entity variant {variant} has no name")
            by_type.setdefault(unit_type, set()).add(code)

    if rows < 1000:
        sys.exit(f"Only {rows} RolePackage rows found, the source format may have changed")

    entries = []
    for role, (all_types, by_type) in sorted(granted.items(), key=lambda item: field(roles[item[0]], "Code")):
        codes = [field(roles[role], "Code"), field(roles[role], "LegacyCode")]
        entry = {"codes": sorted({c.lower() for c in codes if c})}
        if all_types:
            entry["packages"] = sorted(all_types)
        if by_type:
            entry["packagesByUnitType"] = {t: sorted(p - all_types) for t, p in sorted(by_type.items()) if p - all_types}
        entries.append(entry)

    output = {
        "source": f"Altinn/altinn-auth@{SOURCE_COMMIT} src/apps/Altinn.AccessManagement/src/Altinn.AccessMgmt.PersistenceEF/Data/IngestRolePackage.cs",
        "generator": "scripts/generate_role_packages.py",
        "roles": entries,
    }
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{rows} rows read, {len(entries)} roles written to {OUTPUT.name}")


if __name__ == "__main__":
    main()
