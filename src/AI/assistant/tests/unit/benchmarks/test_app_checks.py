"""The skill scores on a small app that does everything a rubric asks, in v8 and in v9, and on breaks of it."""

from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from benchmarks import app_checks
from benchmarks.app_model import load_app
from benchmarks.bench_app import build_app_tree

PACKAGE = "urn:altinn:accesspackage:tilskudd-stotte-erstatning"
TITLES = {
    "navn": "Søkervirksomhetens navn",
    "orgnr": "Organisasjonsnummer",
    "kontakt": "A3. Kontaktperson hos søkervirksomheten",
    "typen": "A6. Hva slags virksomhet er søkeren?",
    "typeannet": "Annet – fyll inn:",
    "tidligere": "A9. Har virksomheten fått tilskudd før?",
    "saksnummer": "A10. Hvis ja: Oppgi årstall",
    "prosjekt": "B1. Prosjektets navn",
    "belop": "D6. Hvor mye søker dere om, i kroner?",
    "kostnad": "D7. Hva er den samlede kostnaden, i kroner?",
}
A1 = "A1. Søkervirksomhetens navn og organisasjonsnummer."
RUBRIC: dict[str, Any] = {
    "languages": ["nb", "nn", "en"],
    "language_selector": True,
    "conditional_fields": [
        {"field": TITLES["saksnummer"], "controller": TITLES["tidligere"], "shown_for": "Ja"},
        {"field": TITLES["typeannet"], "controller": TITLES["typen"], "shown_for": "Annet"},
    ],
    "shared_code_list": [TITLES["tidligere"]],
    "code_list_files": [TITLES["typen"]],
    "required_fields": [A1, TITLES["prosjekt"], TITLES["belop"]],
    "numeric_fields": [TITLES["belop"], TITLES["kostnad"]],
    "patterns": [{"field": A1, "accepts": ["123456789"], "rejects": ["12345678", "12345678a"]}],
    "expression_validations": [
        {"values": {TITLES["belop"]: 600000, TITLES["kostnad"]: 500000}, "fails": True},
        {"values": {TITLES["belop"]: 400000, TITLES["kostnad"]: 500000}, "fails": False},
    ],
    "prefill": [
        {"source": "ER", "fields": ["Name", "OrgNumber"], "title": A1},
        {"source": "UserProfile", "title": TITLES["kontakt"], "versions": [8]},
    ],
    "party_types": {"organisation": True, "person": False},
    "attachment": {"content_types": ["application/pdf"], "max_size": 10, "min_count": 1, "max_count": 1},
    "gateway": {"field": TITLES["belop"], "routes": {"500000": "end", "500001": "signing"}},
    "pdf_page_fields": [A1, TITLES["belop"]],
    "signs": ["ref-data-as-pdf"],
    "receipt": {
        "fields": [TITLES["prosjekt"]],
        "variable_fields": [TITLES["belop"]],
        "text": "Vi svarer innen 8 uker.",
    },
    "rights": [
        {"task": "data", "subject": PACKAGE, "actions": ["read", "write"], "only": ["write"]},
        {"task": "pdf", "subject": PACKAGE, "actions": ["write"]},
        {
            "task": "signing",
            "subject": "urn:altinn:rolecode:dagl",
            "actions": ["read", "sign", "write"],
            "only": ["sign"],
        },
        {"task": None, "subject": PACKAGE, "actions": ["instantiate"]},
        {"task": "end", "subject": PACKAGE, "actions": ["read"]},
    ],
}


def _write(root: Path, relative: str, content: Any) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content if isinstance(content, str) else json.dumps(content, ensure_ascii=False), encoding="utf-8")


def _input(id_: str, type_: str = "Input", **extra: Any) -> dict[str, Any]:
    return {
        "id": id_,
        "type": type_,
        "textResourceBindings": {"title": f"t.{id_}"},
        "dataModelBindings": {"simpleBinding": id_},
        **extra,
    }


def _rule(rule_id: int, subject: tuple[str, str], actions: list[str], tasks: list[str | None]) -> str:
    def match(category: str, attribute: str, value: str) -> str:
        return (
            f'<xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal"><xacml:AttributeValue>{value}'
            f'</xacml:AttributeValue><xacml:AttributeDesignator AttributeId="{attribute}" Category="{category}" />'
            "</xacml:Match>"
        )

    subject_category = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject"
    resource = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource"
    action = "urn:oasis:names:tc:xacml:3.0:attribute-category:action"

    def scope(task: str | None) -> str:
        app = match(resource, "urn:altinn:org", "[ORG]") + match(resource, "urn:altinn:app", "[APP]")
        if task == "EndEvent_1":
            return app + match(resource, "urn:altinn:end-event", task)
        return app + (match(resource, "urn:altinn:task", task) if task else "")

    return (
        f'<xacml:Rule RuleId="urn:altinn:example:ruleid:{rule_id}" Effect="Permit"><xacml:Target>'
        f"<xacml:AnyOf><xacml:AllOf>{match(subject_category, *subject)}</xacml:AllOf></xacml:AnyOf>"
        f"<xacml:AnyOf>{''.join(f'<xacml:AllOf>{scope(t)}</xacml:AllOf>' for t in tasks)}</xacml:AnyOf>"
        f"<xacml:AnyOf>{''.join(f'<xacml:AllOf>{match(action, "urn:oasis:names:tc:xacml:1.0:action:action-id", a)}</xacml:AllOf>' for a in actions)}"
        "</xacml:AnyOf></xacml:Target></xacml:Rule>"
    )


def _process() -> str:
    nodes = [
        '<bpmn:startEvent id="StartEvent_1" />',
        '<bpmn:task id="Task_1"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data'
        "</altinn:taskType></altinn:taskExtension></bpmn:extensionElements></bpmn:task>",
        '<bpmn:serviceTask id="PdfTask"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>pdf'
        "</altinn:taskType><altinn:pdfConfig /></altinn:taskExtension></bpmn:extensionElements></bpmn:serviceTask>",
        '<bpmn:exclusiveGateway id="Gateway_1"><bpmn:extensionElements><altinn:gatewayExtension>'
        "<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId></altinn:gatewayExtension>"
        "</bpmn:extensionElements></bpmn:exclusiveGateway>",
        '<bpmn:task id="Task_Signering"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>signing'
        "</altinn:taskType><altinn:actions><altinn:action>sign</altinn:action></altinn:actions><altinn:signatureConfig>"
        "<altinn:dataTypesToSign><altinn:dataType>ref-data-as-pdf</altinn:dataType></altinn:dataTypesToSign>"
        "<altinn:signatureDataType>signatures</altinn:signatureDataType>"
        "<altinn:runDefaultValidator>true</altinn:runDefaultValidator></altinn:signatureConfig>"
        "</altinn:taskExtension></bpmn:extensionElements></bpmn:task>",
        '<bpmn:endEvent id="EndEvent_1" />',
    ]
    flows = [
        ("f1", "StartEvent_1", "Task_1", ""),
        ("f2", "Task_1", "PdfTask", ""),
        ("f3", "PdfTask", "Gateway_1", ""),
        ("f4", "Gateway_1", "Task_Signering", '["greaterThan", ["dataModel", "belop"], 500000]'),
        ("f5", "Gateway_1", "EndEvent_1", '["lessThanEq", ["dataModel", "belop"], 500000]'),
        ("f6", "Task_Signering", "EndEvent_1", ""),
    ]
    xml_flows = [
        f'<bpmn:sequenceFlow id="{i}" sourceRef="{s}" targetRef="{t}">'
        + (f"<bpmn:conditionExpression>{c}</bpmn:conditionExpression>" if c else "")
        + "</bpmn:sequenceFlow>"
        for i, s, t, c in flows
    ]
    ids = ["StartEvent_1", "Task_1", "PdfTask", "Gateway_1", "Task_Signering", "EndEvent_1"]
    shapes = [f'<bpmndi:BPMNShape bpmnElement="{i}" />' for i in ids] + [
        f'<bpmndi:BPMNEdge bpmnElement="{i}" />' for i, *_ in flows
    ]
    return (
        '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
        'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:altinn="http://altinn.no/process">'
        f'<bpmn:process id="p">{"".join(nodes + xml_flows)}</bpmn:process>'
        f"<bpmndi:BPMNDiagram><bpmndi:BPMNPlane>{''.join(shapes)}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>"
        "</bpmn:definitions>"
    )


def build_app(root: Path, template: str) -> Path:
    """A small app that does everything RUBRIC asks, as the version's skills say."""
    v9 = template == "v9"
    build_app_tree(template, "ttd", "bench", root, now=datetime(2026, 11, 25, tzinfo=UTC), developer="bench")
    heading = "Heading" if v9 else "Header"
    form = [
        _input("navn", required=True),
        _input("orgnr", required=True),
        _input("kontakt"),
        _input("typen", "RadioButtons", optionsId="virksomhet"),
        _input("typeannet", hidden=["notEquals", ["dataModel", "typen"], "annet"]),
        _input("tidligere", "RadioButtons", optionsId="janei"),
        _input("saksnummer", hidden=["notEquals", ["component", "tidligere"], "ja"]),
        _input("prosjekt", required=True),
        _input("belop", required=True),
        _input("kostnad"),
        {
            "id": "budsjett",
            "type": "FileUpload",
            "textResourceBindings": {"title": "t.budsjett"},
            "maxNumberOfAttachments": 1,
            "minNumberOfAttachments": 1,
            "maxFileSizeInMB": 10,
            "displayMode": "list",
        },
        {"id": "nav", "type": "NavigationButtons"},
    ]
    summary = [
        {"id": f"s-{i}", "type": "Summary2", "target": {"type": "component", "id": i, "taskId": "Task_1"}}
        for i in ("navn", "orgnr", "belop")
    ]
    folders = {
        "Task_1": ("Side1", form, {"order": ["Side1"]}),
        "PdfTask": (
            "PdfSide",
            [{"id": "tittel", "type": heading, "textResourceBindings": {"title": "t.pdf"}, "size": "L"}, *summary],
            {"order": [], "pdfLayoutName": "PdfSide"},
        ),
        "Task_Signering": (
            "Signering",
            [
                {"id": "dokumenter", "type": "SigningDocumentList", "textResourceBindings": {"title": "t.pdf"}},
                {"id": "handlinger", "type": "SigningActions"},
            ],
            {"order": ["Signering"]},
        ),
        "CustomReceipt": (
            "Kvittering",
            [
                {
                    "id": "s-prosjekt",
                    "type": "Summary2",
                    "target": {"type": "component", "id": "prosjekt", "taskId": "Task_1"},
                },
                {"id": "svar", "type": "Paragraph", "textResourceBindings": {"title": "t.svar"}},
            ],
            {"order": ["Kvittering"]},
        ),
    }
    for name in ("form", "Task_1"):
        shutil.rmtree(root / "App" / "ui" / name, ignore_errors=True)
    schema_base = (
        "https://altinn.studio/designer/app-dist/9.0.0-preview.10/schemas/json/layout"
        if v9
        else "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout"
    )
    for folder, (page, components, pages) in folders.items():
        _write(
            root,
            f"App/ui/{folder}/layouts/{page}.json",
            {"$schema": f"{schema_base}/layout.schema.v1.json", "data": {"layout": components}},
        )
        settings = {"$schema": f"{schema_base}/layoutSettings.schema.v1.json", "pages": pages}
        _write(root, f"App/ui/{folder}/Settings.json", {**settings, "defaultDataType": "model"} if v9 else settings)
    if v9:
        _write(root, "App/ui/Settings.json", {"showLanguageSelector": True})
    else:
        sets = [{"id": f, "dataType": "model", "tasks": [f]} for f in folders]
        _write(root, "App/ui/layout-sets.json", {"sets": sets, "uiSettings": {"showLanguageSelector": True}})

    texts = {f"t.{k}": v for k, v in TITLES.items()} | {
        "t.budsjett": "Budsjett",
        "t.pdf": "Søknad",
        "t.svar": "Vi svarer innen 8 uker. Du søkte om {0} kroner.",
        "kode.ja": "Ja",
        "kode.nei": "Nei",
        "kode.kommune": "Kommune",
        "kode.annet": "Annet",
        "d6.over.d7": "D6 er større enn D7",
        "appName": "Søknad",
    }
    for language in ("nb", "nn", "en"):
        resources: list[dict[str, Any]] = [{"id": k, "value": v} for k, v in texts.items()]
        resources[[r["id"] for r in resources].index("t.svar")]["variables"] = [
            {"key": "belop", "dataSource": "dataModel.model"}
        ]
        _write(root, f"App/config/texts/resource.{language}.json", {"language": language, "resources": resources})
    _write(root, "App/options/janei.json", [{"value": "ja", "label": "kode.ja"}, {"value": "nei", "label": "kode.nei"}])
    _write(
        root,
        "App/options/virksomhet.json",
        [{"value": "kommune", "label": "kode.kommune"}, {"value": "annet", "label": "kode.annet"}],
    )

    fields = {
        k: {"type": "string"} for k in ("navn", "kontakt", "typen", "typeannet", "tidligere", "saksnummer", "prosjekt")
    }
    fields |= {
        "orgnr": {"type": "string", "pattern": "^[0-9]{9}$"},
        "belop": {"type": "number"},
        "kostnad": {"type": "number"},
    }
    _write(root, "App/models/model.schema.json", {"type": "object", "properties": fields})
    properties = "".join(f"  public string {name} {{ get; set; }}\n" for name in fields)
    _write(root, "App/models/model.cs", f"namespace Altinn.App.Models.model;\npublic class model\n{{\n{properties}}}\n")
    prefill: dict[str, Any] = {"allowOverwrite": False, "ER": {"Name": "navn", "OrgNumber": "orgnr"}}
    if not v9:
        prefill["UserProfile"] = {"Party.Name": "kontakt"}
    _write(root, "App/models/model.prefill.json", prefill)
    rule = {"message": "d6.over.d7", "condition": ["greaterThan", ["dataModel", ["argv", 0]], ["dataModel", "kostnad"]]}
    _write(root, "App/models/model.validation.json", {"validations": {"belop": [rule]}, "definitions": {}})

    metadata = json.loads((root / "App/config/applicationmetadata.json").read_text(encoding="utf-8"))
    task = (lambda t: {"taskIds": [t]}) if v9 else (lambda t: {"taskId": t})
    metadata["title"] = {"nb": "Søknad", "nn": "Søknad", "en": "Application"}
    metadata["partyTypesAllowed"] = {"bankruptcyEstate": False, "organisation": True, "person": False, "subUnit": False}
    metadata["dataTypes"] += [
        {
            "id": "budsjett",
            "allowedContentTypes": ["application/pdf"],
            "maxSize": 10,
            "minCount": 1,
            "maxCount": 1,
            **task("Task_1"),
        },
        {
            "id": "signatures",
            "allowedContentTypes": ["application/json"],
            "allowedContributors": ["app:owned"],
            "minCount": 1,
            "maxCount": 0,
            **task("Task_Signering"),
        },
    ]
    _write(root, "App/config/applicationmetadata.json", metadata)
    _write(root, "App/config/process/process.bpmn", _process())
    rules = [
        _rule(1, ("urn:altinn:accesspackage", "tilskudd-stotte-erstatning"), ["read", "write"], ["Task_1", "PdfTask"]),
        _rule(2, ("urn:altinn:accesspackage", "tilskudd-stotte-erstatning"), ["instantiate"], [None]),
        _rule(3, ("urn:altinn:accesspackage", "tilskudd-stotte-erstatning"), ["read"], ["EndEvent_1"]),
        _rule(4, ("urn:altinn:rolecode", "dagl"), ["read", "sign", "write"], ["Task_Signering"]),
        _rule(5, ("urn:altinn:org", "[org]"), ["read", "write", "complete"], [None]),
    ]
    _write(
        root,
        "App/config/authorization/policy.xml",
        '<xacml:Policy xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17">'
        f"{''.join(rules)}<xacml:ObligationExpressions /></xacml:Policy>",
    )
    if not v9:
        settings = json.loads((root / "App/appsettings.json").read_text(encoding="utf-8"))
        settings["AppSettings"] |= {"RequiredValidation": True, "ExpressionValidation": True}
        _write(root, "App/appsettings.json", settings)
    return root


def scores(root: Path, template: str) -> dict[str, tuple[float, str]]:
    return {s.name: (s.value, s.comment) for s in app_checks.evaluate(load_app(root), RUBRIC, template)}


@pytest.fixture(autouse=True)
def _offline_v8_schema(monkeypatch):
    """The v8 layout schema is on altinncdn.no, so a unit test leaves it unmeasured."""
    real = app_checks._schemas
    monkeypatch.setattr(app_checks, "_schemas", lambda v9: real(v9) if v9 else None)


@pytest.mark.parametrize("template", ["v8", "v9"])
def test_an_app_that_does_everything_scores_full_marks(tmp_path, template):
    found = scores(build_app(tmp_path, template), template)
    failing = {name: comment for name, (value, comment) in found.items() if value < 1}
    assert not failing
    expected = set(app_checks.SCORE_NAMES) - ({"bench_schema_valid"} if template == "v8" else set())
    assert set(found) == expected


def _edit(root: Path, relative: str, change) -> None:
    path = root / relative
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    _write(root, relative, data)


BREAKS = {
    "a hidden expression that hides for the wrong answer": (
        "bench_expressions",
        lambda r, ui: _edit(
            r,
            f"App/ui/{ui}/layouts/Side1.json",
            lambda d: d["data"]["layout"][6].update(hidden=["equals", ["component", "tidligere"], "ja"]),
        ),
    ),
    "a gateway that sends the limit itself to signing": (
        "bench_process",
        lambda r, ui: _write(
            r,
            "App/config/process/process.bpmn",
            _process().replace("greaterThan", "greaterThanEq").replace('"lessThanEq"', '"lessThan"'),
        ),
    ),
    "a signature data type that users can write": (
        "bench_signing",
        lambda r, ui: _edit(
            r, "App/config/applicationmetadata.json", lambda d: d["dataTypes"][-1].pop("allowedContributors")
        ),
    ),
    "a missing nynorsk text": (
        "bench_texts",
        lambda r, ui: _edit(r, "App/config/texts/resource.nn.json", lambda d: d["resources"].pop(0)),
    ),
    "a validation rule turned around": (
        "bench_validation",
        lambda r, ui: _edit(
            r,
            "App/models/model.validation.json",
            lambda d: d["validations"]["belop"][0].update(
                condition=["lessThan", ["dataModel", ["argv", 0]], ["dataModel", "kostnad"]]
            ),
        ),
    ),
    "people may also start the app": (
        "bench_settings",
        lambda r, ui: _edit(
            r, "App/config/applicationmetadata.json", lambda d: d["partyTypesAllowed"].update(person=True)
        ),
    ),
    "the yes/no list inline": (
        "bench_code_lists",
        lambda r, ui: _edit(
            r,
            f"App/ui/{ui}/layouts/Side1.json",
            lambda d: d["data"]["layout"][5].update(optionsId=None, options=[{"value": "ja", "label": "kode.ja"}]),
        ),
    ),
    "a binding outside the data model": (
        "bench_references",
        lambda r, ui: _edit(
            r,
            f"App/ui/{ui}/layouts/Side1.json",
            lambda d: d["data"]["layout"][0]["dataModelBindings"].update(simpleBinding="finnesIkke"),
        ),
    ),
    "a changed library version": (
        "bench_scaffold_intact",
        lambda r, ui: _write(
            r, "App/App.csproj", (r / "App/App.csproj").read_text(encoding="utf-8").replace('Version="', 'Version="1')
        ),
    ),
}


@pytest.mark.parametrize("template", ["v8", "v9"])
@pytest.mark.parametrize("case", sorted(BREAKS))
def test_a_break_lowers_its_score(tmp_path, template, case):
    name, change = BREAKS[case]
    root = build_app(tmp_path, template)
    change(root, "Task_1")
    value, comment = scores(root, template)[name]
    assert value < 1, comment


@pytest.mark.parametrize(
    ("template", "name", "change"),
    [
        ("v9", "bench_version_conformance", lambda r: _write(r, "App/ui/layout-sets.json", {"sets": []})),
        (
            "v9",
            "bench_prefill",
            lambda r: _edit(r, "App/models/model.prefill.json", lambda d: d.update(UserProfile={"Email": "kontakt"})),
        ),
        (
            "v8",
            "bench_process",
            lambda r: _edit(
                r, "App/config/applicationmetadata.json", lambda d: d["dataTypes"][1].update(enablePdfCreation=True)
            ),
        ),
        (
            "v8",
            "bench_version_conformance",
            lambda r: _edit(
                r,
                "App/config/applicationmetadata.json",
                lambda d: d["dataTypes"][-1].update(taskIds=["Task_Signering"]),
            ),
        ),
    ],
)
def test_a_version_rule_lowers_its_score(tmp_path, template, name, change):
    root = build_app(tmp_path, template)
    change(root)
    value, comment = scores(root, template)[name]
    assert value < 1, comment


def test_an_answer_label_with_more_words_is_still_the_answer(tmp_path):
    """Assistants often keep the PDF's «Annet – fyll inn» as the label of the answer «Annet»."""
    root = build_app(tmp_path, "v9")
    for language in ("nb", "nn", "en"):
        _edit(
            root,
            f"App/config/texts/resource.{language}.json",
            lambda d: [r.update(value="Annet – fyll inn") for r in d["resources"] if r["id"] == "kode.annet"],
        )
    value, comment = scores(root, "v9")["bench_expressions"]
    assert value == 1, comment
