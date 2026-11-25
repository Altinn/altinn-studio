"""Scores for the parts of an app that the skills cover, one score per skill.

Each score is the share of its checks that pass, and its comment names the checks that fail. A check the bench
cannot measure, such as an expression with a function the evaluator lacks, is left out of the share and named in the
comment. The rubric holds what the item asks for: fields by title, values, rights. The checks hold only where v8 and
v9 keep each part, as the skills' version files describe, so a check works for any item.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterable
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

from . import expressions
from .app_model import INPUT_COMPONENT_TYPES, AppModel, Flow, Rule, UiFolder, binding, normalize_title, property_names
from .bench_app import TEMPLATES_DIR
from .evaluators import Score
from .rubric import STRUCTURAL_KEYS

SERVICE_TASK_TYPES = {"pdf", "subformPdf", "eFormidling", "fiksArkiv"}
SERVICE_OWNER = "urn:altinn:org"
PDF_DATA_TYPE = "ref-data-as-pdf"
APP_OWNED = "app:owned"
# A v8 layout set and a v9 UI folder name the custom receipt as this task
RECEIPT_TASK = "CustomReceipt"
DEFAULT_LANGUAGE = "nb"

# A title that has all the words of another matches it only when it is at least this share of the other's length,
# so «Navn» does not match every title with a name in it.
SIMILAR_TITLE_MIN_SHARE = 0.3
# How much of a field title a check's label shows, and how many items a score's comment names.
LABEL_LENGTH = 20
COMMENT_FOUND = 4
COMMENT_FAILED = 12
COMMENT_SKIPPED = 6

# What a v8 app lacks, as the v8 file of the studio-expressions skill says. The v8 backend has the list functions, so
# a gateway condition, which only the backend evaluates, may use them.
V8_LACKS = frozenset({"formatNumber"})
V8_FRONTEND_LACKS = frozenset({"list", "object", "jmespath", "sum", "average", "count"})
# A list in these properties is an expression, so an unknown function there is a misspelling, not a list of IDs.
EXPRESSION_PROPERTIES = frozenset({"hidden", "hiddenRow", "required", "readOnly", "condition"})

# The fields in the docs' list of prefill sources, with the two corrections the prefill skill gives.
_PREFILL_SOURCES = {
    "ER": "OrgNumber Name UnitType TelephoneNumber MobileNumber FaxNumber EMailAddress InternetAddress MailingAddress "
    "MailingPostalCode MailingPostalCity BusinessAddress BusinessPostalCode BusinessPostalCity",
    "DSF": "SSN Name FirstName MiddleName LastName TelephoneNumber MobileNumber MailingAddress MailingPostalCode "
    "MailingPostalCity AddressMunicipalNumber AddressMunicipalName AddressStreetName AddressHouseNumber "
    "AddressHouseLetter AddressPostalCode AddressCity",
    "UserProfile": "UserId UserName PhoneNumber Email PartyId Party.PartyId Party.PartyTypeName Party.OrgNumber "
    "Party.SSN Party.UnitType Party.Name Party.IsDeleted Party.OnlyHierarchyElementWithNoAccess UserType "
    "ProfileSettingPreference.Language ProfileSettingPreference.PreSelectedPartyId "
    "ProfileSettingPreference.DoNotPromptForParty",
}
PREFILL_SOURCES = {source: set(names.split()) for source, names in _PREFILL_SOURCES.items()}
# The user's Party.Person and Party.Organization are the person and the organization that DSF and ER read.
PREFILL_SOURCES["UserProfile"] |= {f"Party.Person.{name}" for name in PREFILL_SOURCES["DSF"]}
PREFILL_SOURCES["UserProfile"] |= {f"Party.Organization.{name}" for name in PREFILL_SOURCES["ER"]}


@dataclass(frozen=True)
class SkillRubric:
    """What an item asks of the skills, from its expectedOutput. A field the item leaves out turns its checks off."""

    languages: list[str] = field(default_factory=lambda: [DEFAULT_LANGUAGE])
    language_selector: bool = False
    conditional_fields: list[dict[str, str]] = field(default_factory=list)
    shared_code_list: list[str] = field(default_factory=list)
    code_list_files: list[str] = field(default_factory=list)
    required_fields: list[str] = field(default_factory=list)
    numeric_fields: list[str] = field(default_factory=list)
    patterns: list[dict[str, Any]] = field(default_factory=list)
    expression_validations: list[dict[str, Any]] = field(default_factory=list)
    prefill: list[dict[str, Any]] = field(default_factory=list)
    party_types: dict[str, bool] = field(default_factory=dict)
    attachment: dict[str, Any] | None = None
    gateway: dict[str, Any] | None = None
    pdf_page_fields: list[str] = field(default_factory=list)
    signs: list[str] = field(default_factory=list)
    receipt: dict[str, Any] | None = None
    rights: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def parse(cls, expected_output: dict[str, Any]) -> SkillRubric:
        """The skill fields of an item's expectedOutput. A key nothing reads fails, so that a misspelled key cannot
        turn its checks off without notice."""
        names = {f.name for f in fields(cls)}
        unknown = set(expected_output) - names - STRUCTURAL_KEYS
        if unknown:
            raise ValueError(f"the rubric has keys no check reads: {', '.join(sorted(unknown))}")
        return cls(**{key: value for key, value in expected_output.items() if key in names})


@dataclass
class Checks:
    """The checks behind one score."""

    name: str
    failed: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    passed: int = 0

    def check(self, label: str, ok: bool | None) -> None:
        if ok is None:
            self.skipped.append(label)
        elif ok:
            self.passed += 1
        else:
            self.failed.append(label)

    def none(self, label: str, found: Iterable[Any]) -> None:
        """Pass when nothing is found, and name the first few that are."""
        found = sorted({str(item) for item in found})
        self.check(f"{label}, not {', '.join(found[:COMMENT_FOUND])}" if found else label, not found)

    def score(self) -> Score | None:
        measured = self.passed + len(self.failed)
        if not measured:
            return None
        parts = [f"{self.passed}/{measured} checks pass"]
        if self.failed:
            more = "; …" if len(self.failed) > COMMENT_FAILED else ""
            parts.append("failed: " + "; ".join(self.failed[:COMMENT_FAILED]) + more)
        if self.skipped:
            parts.append("not measured: " + "; ".join(self.skipped[:COMMENT_SKIPPED]))
        return Score(self.name, round(self.passed / measured, 4), "NUMERIC", " — ".join(parts))


@dataclass
class _View:
    """The app, with the lookups that several checks share."""

    app: AppModel
    rubric: SkillRubric
    template: str

    @property
    def version(self) -> int:
        return int(self.template.lstrip("v"))

    @property
    def v9(self) -> bool:
        return self.version >= 9

    @property
    def data_task(self) -> str | None:
        process = self.app.process
        return next((n for n in process.reachable(process.start) if process.nodes[n].task_type == "data"), None)

    def task_after(self, kind: str) -> str | None:
        """The nearest task of a type after the data task."""
        nodes = self.app.process.nodes
        return next((n for n in self.app.process.reachable(self.data_task or "") if nodes[n].task_type == kind), None)

    @property
    def form(self) -> UiFolder | None:
        return self.app.folder_for_task(self.data_task or "")

    @property
    def form_type(self) -> str | None:
        return self.form.data_type if self.form else None

    def task_ids(self, data_type: dict[str, Any]) -> list[str | None]:
        """The tasks of a data type: the list `taskIds` in v9, the one `taskId` in v8."""
        return list(data_type.get("taskIds") or []) if self.v9 else [data_type.get("taskId")]

    def fields(self, title: str) -> list[tuple[UiFolder, dict[str, Any]]]:
        """The input components of the form with this title after normalizing. Without one, those with the same
        field number, such as «A5.», and else those whose words are all in the title or that have all its words. So
        the two fields a name and number field is split into are both found. A field on the PDF page or the receipt
        is not a field of the form."""
        wanted, number = normalize_title(title), _number(title)
        exact, numbered, similar = [], [], []
        for folder, _, component in self.app.all_components():
            key = (component.get("textResourceBindings") or {}).get("title")
            text = (self.app.text(key) or key) if isinstance(key, str) else ""
            have = normalize_title(text)
            if component.get("type") not in INPUT_COMPONENT_TYPES or not have or not wanted:
                continue
            if self.form is not None and folder is not self.form:
                continue
            found = (folder, component)
            share = min(len(have), len(wanted)) / max(len(have), len(wanted))
            if have == wanted:
                exact.append(found)
            elif number and _number(text) == number:
                numbered.append(found)
            elif _same_words(have, wanted) and share >= SIMILAR_TITLE_MIN_SHARE:
                similar.append(found)
        return exact or numbered or similar

    def paths(self, title: str) -> set[tuple[str | None, str]]:
        """(data type, path) of the fields with this title."""
        return {(b[0] or f.data_type, b[1]) for f, c in self.fields(title) if (b := binding(c)) is not None}

    def options(self, component: dict[str, Any]) -> list[dict[str, Any]]:
        found = component.get("options") or self.app.options.get(component.get("optionsId") or "")
        return found if isinstance(found, list) else []

    def label(self, option: dict[str, Any]) -> str:
        return normalize_title(self.app.text(option.get("label")) or str(option.get("label")))


def _number(title: str) -> str | None:
    """The number a numbered form gives a field, such as "a5" in «A5. Kontaktinformasjon»."""
    found = re.match(r"\s*([A-Za-z]?\d+(?:\.\d+)*)[.)]?\s", title)
    return found.group(1).lower() if found else None


def _same_words(have: str, wanted: str) -> bool:
    """One title has all the words of the other."""
    return set(have.split()) <= set(wanted.split()) or set(wanted.split()) <= set(have.split())


def _short(title: str) -> str:
    return title[:LABEL_LENGTH]


def _nest(values: dict[str, Any]) -> dict[str, Any]:
    nested: dict[str, Any] = {}
    for path, value in values.items():
        *parents, last = path.split(".")
        node = nested
        for part in parents:
            node = node.setdefault(part, {})
        node[last] = value
    return nested


def _form(data_type: str | None, values: dict[str, Any], folder: UiFolder | None = None) -> expressions.FormContext:
    """A form with these values, for evaluating expressions."""
    data_type = data_type or "default"
    pages = folder.pages if folder else {}
    return expressions.FormContext(
        data={data_type: _nest(values)},
        layouts={p: folder.components(p) for p in pages} if folder else {},
        hidden_pages={p: (layout.get("data") or {}).get("hidden") for p, layout in pages.items()},
        default_data_type=data_type,
    )


def _evaluates(expression: Any, context: expressions.FormContext) -> Any:
    """The value, or None when the bench cannot evaluate it."""
    try:
        return expressions.evaluate(expression, context)
    except expressions.Unsupported, expressions.ExpressionError, RecursionError:
        return None


def _expressions_in(value: Any, expected: bool = False) -> Iterable[Any]:
    """Every expression in a JSON value: a list whose first item names a known function, and any list with a string
    first, where only an expression can be."""
    named = isinstance(value, list) and bool(value) and isinstance(value[0], str)
    if named and (expected or value[0] in expressions.KNOWN_FUNCTIONS):
        yield value
    elif isinstance(value, dict):
        for key, item in value.items():
            if key == "textResourceBindings" and isinstance(item, dict):
                for text in item.values():
                    yield from _expressions_in(text, expected=True)
            else:
                yield from _expressions_in(item, expected=key in EXPRESSION_PROPERTIES)
    elif isinstance(value, list):
        for item in value:
            yield from _expressions_in(item)


def _text_keys(component: dict[str, Any]) -> list[str]:
    """The text keys a component names. A binding to an expression names none."""
    bindings = component.get("textResourceBindings")
    return [v for v in bindings.values() if isinstance(v, str) and v.strip()] if isinstance(bindings, dict) else []


def _option_labels(app: AppModel) -> set[str]:
    return {
        option["label"]
        for options in app.options.values()
        if isinstance(options, list)
        for option in options
        if isinstance(option, dict) and isinstance(option.get("label"), str)
    }


def _contributors(data_type: dict[str, Any]) -> Any:
    """allowedContributors, or allowedContributers, the old spelling that the app libraries still read."""
    return data_type.get("allowedContributors", data_type.get("allowedContributers"))


def _read(path: Path | None) -> str:
    try:
        return path.read_text(encoding="utf-8") if path else ""
    except OSError:
        return ""


def _texts(view: _View, checks: Checks) -> None:
    app = view.app
    used = {key for _, _, component in app.all_components() for key in _text_keys(component)} | _option_labels(app)
    for language in view.rubric.languages:
        texts = app.texts.get(language, {})
        checks.check(f"resource.{language}.json", app.text_files.get(language, {}).get("language") == language)
        checks.none(f"{language} has every used text", (k for k in used if not texts.get(k, {}).get("value")))
        checks.check(f"title in {language}", bool((app.metadata.get("title") or {}).get(language)))
        checks.check(f"appName in {language}", bool(texts.get("appName", {}).get("value")))
    if view.rubric.language_selector:
        in_folder = any((f.settings.get("pages") or {}).get("showLanguageSelector") for f in app.folders.values())
        checks.check("language selector on", app.ui_settings.get("showLanguageSelector") is True or in_folder)
    checks.none(
        "every {n} has a variable",
        (
            f"{language}:{key}"
            for language, texts in app.texts.items()
            for key, entry in texts.items()
            for n in re.findall(r"\{(\d+)\}", str(entry.get("value", "")))
            if int(n) >= len(entry.get("variables") or [])
        ),
    )


def _layouts(view: _View, checks: Checks) -> None:
    for folder in view.app.folders.values():
        pdf_page = (folder.settings.get("pages") or {}).get("pdfLayoutName")
        loose = (set(folder.pages) ^ set(folder.order)) - {pdf_page}
        checks.check(f"{folder.name}: pages.order and files agree", not loose)
        ids = [c.get("id") for c in folder.components()]
        checks.check(f"{folder.name}: unique component ids", len(ids) == len(set(ids)))
    if view.rubric.receipt:
        _receipt(view, checks, view.rubric.receipt)
    if view.rubric.pdf_page_fields:
        _pdf_page(view, checks, view.rubric.pdf_page_fields)
    if view.rubric.attachment:
        uploads = {c.get("id") for c in _components(view.form) if c.get("type") == "FileUpload"}
        checks.check("FileUpload for an attachment data type", bool(uploads & set(view.app.data_types())))


def _receipt(view: _View, checks: Checks, spec: dict[str, Any]) -> None:
    app = view.app
    receipt = app.folder_for_task(RECEIPT_TASK)
    checks.check("custom receipt on the form's data type", bool(receipt) and receipt.data_type == view.form_type)
    read = _read_by(view, receipt)
    for title in spec.get("fields") or []:
        checks.check(f"receipt shows {_short(title)}", bool(view.paths(title) & read))
    variables = _variables(view, receipt)
    for title in spec.get("variable_fields") or []:
        checks.check(f"receipt variable {_short(title)}", bool({p for _, p in view.paths(title)} & variables))
    texts = {app.text(key) or "" for c in _components(receipt) for key in _text_keys(c)}
    checks.check("receipt text", any(spec.get("text", "") in text for text in texts))


def _pdf_page(view: _View, checks: Checks, titles: list[str]) -> None:
    app = view.app
    pdf_task = view.task_after("pdf")
    folder = app.folder_for_task(pdf_task or "")
    page = ((folder.settings.get("pages") or {}).get("pdfLayoutName") if folder else None) or ""
    folder = folder if folder and page in folder.pages else None
    checks.check("PDF task has a pdfLayoutName page", folder is not None)
    node = app.process.nodes.get(pdf_task or "")
    checks.check("PDF task has no autoPdfTaskIds", bool(node) and not node.texts("pdfConfig/autoPdfTaskIds/taskId"))
    read = _read_by(view, folder, page)
    for title in titles:
        checks.check(f"PDF page shows {_short(title)}", bool(view.paths(title) & read))
    heading = "Heading" if view.v9 else "Header"
    checks.check(f"PDF page has a {heading}", any(c.get("type") == heading for c in _components(folder, page)))


def _components(folder: UiFolder | None, page: str | None = None) -> list[dict[str, Any]]:
    return folder.components(page) if folder else []


def _read_by(view: _View, folder: UiFolder | None, page: str | None = None) -> set[tuple[str | None, str]]:
    """The data model fields a folder or a page shows: its bindings, what its summaries point at, and the fields its
    text variables read."""
    by_id = {c.get("id"): (f, c) for f, _, c in view.app.all_components()}
    read: set[tuple[str | None, str]] = set()
    for component in _components(folder, page):
        target = component.get("target")
        target = target if isinstance(target, dict) else {}
        shown = [(folder, component)] + [
            by_id[r] for r in (component.get("componentRef"), target.get("id")) if r in by_id
        ]
        for owner, item in shown:
            for key in item.get("dataModelBindings") or {}:
                if (bound := binding(item, key)) is not None and owner:
                    read.add((bound[0] or owner.data_type, bound[1]))
    variables = _variables(view, folder, page)
    return read | {(data_type, path) for path in variables for data_type in view.app.data_types()}


def _variables(view: _View, folder: UiFolder | None, page: str | None = None) -> set[str]:
    keys = {key for c in _components(folder, page) for key in _text_keys(c)}
    entries = [view.app.texts.get(DEFAULT_LANGUAGE, {}).get(k) or {} for k in keys]
    return {
        v.get("key")
        for entry in entries
        for v in entry.get("variables") or []
        if str(v.get("dataSource", "")).startswith("dataModel.")
    }


def _expressions(view: _View, checks: Checks) -> None:
    app = view.app
    for pair in view.rubric.conditional_fields:
        label = f"{_short(pair['field'])} shows only for {pair['shown_for']} in {_short(pair['controller'])}"
        checks.check(label, _shows_only_for(view, pair))
    in_forms = _expressions_in([*(f.pages for f in app.folders.values()), *app.validation.values()])
    in_gateways = (e for flow in app.process.flows.values() for e in _expressions_in(flow.condition, expected=True))
    missing = _missing_functions(in_forms, frozenset() if view.v9 else V8_LACKS | V8_FRONTEND_LACKS)
    missing |= _missing_functions(in_gateways, frozenset() if view.v9 else V8_LACKS)
    checks.none(f"every function exists in {view.template}", missing)


def _missing_functions(found: Iterable[Any], lacking: frozenset[str]) -> set[str]:
    return {
        name
        for expression in found
        for name in expressions.functions_used(expression)
        if name not in expressions.KNOWN_FUNCTIONS or name in lacking
    }


def _shows_only_for(view: _View, pair: dict[str, str]) -> bool | None:
    """Fill in the controller with each of its options and with nothing, and see when the field shows. An invalid
    expression fails, as it does in the app."""
    controllers = view.fields(pair["controller"])
    if not controllers:
        return False
    folder, controller = controllers[0]
    bound, options = binding(controller), view.options(controller)
    if bound is None or not options:
        return None
    values = [str(o.get("value")) for o in options]
    answer = normalize_title(pair["shown_for"])
    wanted = [str(o.get("value")) for o in options if view.label(o) == answer]
    wanted = wanted or [str(o.get("value")) for o in options if answer in view.label(o).split()]
    dependents = [c for f, c in view.fields(pair["field"]) if f is folder]
    if not wanted or not dependents:
        return False
    others = [v for v in values if v != wanted[0]]
    several = controller.get("type") in ("Checkboxes", "MultipleSelect") and others
    cases = {f"{others[0]},{wanted[0]}" if several else wanted[0]: False, None: True, **dict.fromkeys(others, True)}
    for dependent in dependents:
        outcomes = []
        for value, hidden in cases.items():
            try:
                context = _form(folder.data_type, {bound[1]: value}, folder)
                outcomes.append(context.is_hidden(dependent.get("id", "")) == hidden)
            except expressions.ExpressionError:
                outcomes.append(False)
            except expressions.Unsupported, RecursionError:
                outcomes.append(None)
        if all(outcomes):
            return True
        if False not in outcomes:
            return None
    return False


def _process(view: _View, checks: Checks) -> None:
    checks.check("process.bpmn parses", view.app.process_error is None)
    _process_shape(view, checks)
    pdf_task = view.task_after("pdf")
    _pdf_task(view, checks, pdf_task)
    if view.rubric.gateway:
        _gateway(view, checks, pdf_task, view.rubric.gateway)


def _process_shape(view: _View, checks: Checks) -> None:
    process = view.app.process
    nodes, flows = process.nodes, process.flows.values()
    checks.none("every flow joins two elements", (f.id for f in flows if {f.source, f.target} - set(nodes)))
    checks.none(
        "each element has a way out",
        (n.id for n in nodes.values() if n.kind != "endEvent" and not process.outgoing(n.id)),
    )
    checks.none("each task has one way out", (t.id for t in process.tasks() if len(process.outgoing(t.id)) != 1))
    checks.none(
        "each task has a type on the right element",
        (
            t.id
            for t in process.tasks()
            if not t.task_type or (t.kind == "serviceTask") != (t.task_type in SERVICE_TASK_TYPES)
        ),
    )
    checks.none("each element has a diagram shape", (set(nodes) | set(process.flows)) - process.shapes)


def _pdf_task(view: _View, checks: Checks, pdf_task: str | None) -> None:
    app = view.app
    after_data = [f.target for f in app.process.outgoing(view.data_task or "")]
    checks.check("a PDF task follows the data task", after_data == [pdf_task])
    pdf = app.data_types().get(PDF_DATA_TYPE) or {}
    checks.check(f"{PDF_DATA_TYPE} allows a PDF", "application/pdf" in (pdf.get("allowedContentTypes") or []))
    if not view.v9:
        form = app.data_types().get(view.form_type or "") or {}
        checks.check("v8: enablePdfCreation false, so one PDF", form.get("enablePdfCreation") is False)


def _gateway(view: _View, checks: Checks, pdf_task: str | None, spec: dict[str, Any]) -> None:
    process = view.app.process
    nodes = process.nodes
    after_pdf = [nodes[f.target] for f in process.outgoing(pdf_task or "") if f.target in nodes]
    gateway = after_pdf[0] if after_pdf and after_pdf[0].kind == "exclusiveGateway" else None
    checks.check("a gateway follows the PDF task", gateway is not None)
    if gateway is None:
        return
    outgoing = process.outgoing(gateway.id)
    checks.check(
        "each gateway flow has a condition, no default", all(f.has_condition for f in outgoing) and not gateway.default
    )
    data_types = [data_type for f in outgoing for _, data_type in expressions.data_model_refs(f.condition)]
    checks.check(
        "the gateway names its data type",
        bool(gateway.text("connectedDataTypeId")) or (bool(data_types) and all(data_types)),
    )
    paths = {p for _, p in view.paths(spec["field"])}
    for value, expected in spec["routes"].items():
        checks.check(f"{value} goes to {expected}", _route(view, outgoing, paths, float(value)) == expected)


def _route(view: _View, flows: list[Flow], paths: set[str], amount: float) -> str | None:
    """Where the gateway sends the instance: "signing", "end", or None when not exactly one flow is true."""
    context = _form(view.form_type, dict.fromkeys(paths, amount))
    taken = [f for f in flows if paths and _evaluates(f.condition, context) is True]
    if len(taken) != 1:
        return None
    nodes = view.app.process.nodes
    ahead = [taken[0].target, *view.app.process.reachable(taken[0].target)]
    return "signing" if any(n in nodes and nodes[n].task_type == "signing" for n in ahead) else "end"


def _signing(view: _View, checks: Checks) -> None:
    app = view.app
    task = view.task_after("signing")
    checks.check("a signing task follows the data task", task is not None)
    if task is None:
        return
    node, types, folder = app.process.nodes[task], app.data_types(), app.folder_for_task(task)
    checks.check("signing task has pages with a data type", bool(folder) and folder.data_type in types)
    checks.check("signing task lists sign", "sign" in node.texts("actions/action"))
    signed = node.texts("signatureConfig/dataTypesToSign/dataType")
    checks.check("dataTypesToSign exist", bool(signed) and all(s in types for s in signed))
    for wanted in view.rubric.signs:
        checks.check(f"signs {wanted}", wanted in signed)
    if PDF_DATA_TYPE in signed:
        before = _always_before(view, task)
        checks.check("a PDF task comes before signing", any(app.process.nodes[n].task_type == "pdf" for n in before))
    signature = types.get(node.text("signatureConfig/signatureDataType") or "") or {}
    checks.check("signatureDataType exists", bool(signature))
    checks.check("signature data type is app-owned", _contributors(signature) == [APP_OWNED])
    checks.check("signature data type holds JSON", signature.get("allowedContentTypes") == ["application/json"])
    key = "taskIds" if view.v9 else "taskId"
    checks.check(f"signature data type bound with {key}", task in view.task_ids(signature))
    checks.check("signature data type has minCount", int(signature.get("minCount") or 0) >= 1)
    checks.check("runDefaultValidator is true", node.text("signatureConfig/runDefaultValidator") == "true")
    provider = node.text("signatureConfig/signeeProviderId") or node.text("signatureConfig/signeeStatesDataTypeId")
    checks.check("no signee provider for role signing", not provider)
    components = _components(folder)
    checks.check(
        "signing pages have SigningDocumentList", any(c.get("type") == "SigningDocumentList" for c in components)
    )
    # SigningActions offers the submit button only to users with write. An ActionButton that signs moves on by itself.
    submits = any(c.get("type") == "SigningActions" for c in components) and _someone_may(view, "write", task)
    signs_and_submits = any(c.get("type") == "ActionButton" and c.get("action") == "sign" for c in components)
    checks.check("SigningActions and a user who may write, or a sign ActionButton", submits or signs_and_submits)


def _someone_may(view: _View, action: str, task: str) -> bool:
    """Whether a subject other than the service owner may do `action` in `task`."""
    return any(
        action in rule.actions and rule.covers_task(task) and any(s[0] != SERVICE_OWNER for s in rule.subjects)
        for rule in view.app.rules
    )


def _always_before(view: _View, target: str) -> set[str]:
    """The elements every path from the start passes before `target`."""
    process = view.app.process
    paths: list[set[str]] = []

    def walk(node: str, trail: list[str]) -> None:
        if node == target:
            paths.append(set(trail))
        for flow in process.outgoing(node) if node != target else []:
            if flow.target not in trail:
                walk(flow.target, [*trail, node])

    walk(process.start, [])
    return set.intersection(*paths) if paths else set()


def _policy(view: _View, checks: Checks) -> None:
    app = view.app
    checks.check("policy.xml parses", app.policy_error is None)
    if app.policy_error is not None:
        return
    ids = [r.id for r in app.rules]
    checks.check("RuleIds are unique", len(ids) == len(set(ids)))
    checks.check(
        "each rule has a subject, a resource and an action",
        all(r.any_of_count == 3 and r.subjects and r.actions for r in app.rules),
    )
    obligations = app.policy_text.find("ObligationExpressions")
    ordered = obligations < 0 or app.policy_text.rfind("<xacml:Rule ") < obligations
    checks.check("rules before obligations, no comments", ordered and "<!--" not in app.policy_text)
    tasks = {"data": view.data_task, "pdf": view.task_after("pdf"), "signing": view.task_after("signing"), "end": "end"}
    for right in view.rubric.rights:
        task, subject = tasks.get(right["task"]), _subject(right["subject"])
        who, where = subject[1], right["task"] or "the app"
        for action in right["actions"]:
            checks.check(
                f"{who} may {action} in {where}",
                any(subject in r.subjects and action in r.actions and _covers(r, task) for r in app.rules),
            )
        for action in right.get("only") or []:
            others = (
                s[1]
                for r in app.rules
                if action in r.actions and _covers(r, task)
                for s in r.subjects
                if s[0] != SERVICE_OWNER and s != subject
            )
            checks.none(f"only {who} may {action} in {where}", others)


def _subject(urn: str) -> tuple[str, str]:
    attribute, _, value = urn.rpartition(":")
    return attribute, value.lower()


def _covers(rule: Rule, task: str | None) -> bool:
    """Whether a rule applies in `task`, where "end" is the end event."""
    return rule.covers_end_event() if task == "end" else rule.covers_task(task)


def _prefill(view: _View, checks: Checks) -> None:
    app, types = view.app, view.app.data_types()
    parties = app.metadata.get("partyTypesAllowed") or {}
    for name, prefill in app.prefill.items():
        created = bool(((types.get(name) or {}).get("appLogic") or {}).get("autoCreate"))
        checks.check(f"{name}.prefill.json is for a created data type", created)
        checks.check(f"{name}.prefill.json sets allowOverwrite", "allowOverwrite" in prefill)
        for source, mapping in prefill.items():
            for source_field, target in (
                mapping.items() if source in PREFILL_SOURCES and isinstance(mapping, dict) else []
            ):
                found = app.field_schema(name, str(target))
                checks.check(f"{source}.{source_field} is a source field", source_field in PREFILL_SOURCES[source])
                checks.check(f"{target} exists outside a list", bool(found) and not found[1])
        if view.v9 and created:
            checks.check("v9: no UserProfile at task start", "UserProfile" not in prefill)
        if "ER" in prefill and any(parties.values()):
            checks.check("ER prefill, so no persons may start", not parties.get("person"))
    for entry in view.rubric.prefill:
        if view.version not in entry.get("versions", [view.version]):
            continue
        paths = view.paths(entry["title"])
        sources = {
            f
            for name, p in app.prefill.items()
            for f, t in (p.get(entry["source"]) or {}).items()
            if (name, t) in paths
        }
        wanted = set(entry.get("fields") or [])
        checks.check(
            f"{entry['source']} fills {_short(entry['title'])}", wanted <= sources if wanted else bool(sources)
        )


def _settings(view: _View, checks: Checks) -> None:
    app, rubric = view.app, view.rubric
    allowed = app.metadata.get("partyTypesAllowed") or {}
    for party, wanted in rubric.party_types.items():
        checks.check(f"partyTypesAllowed.{party} is {wanted}", bool(allowed.get(party)) is wanted)
    if not (spec := rubric.attachment):
        return
    attachments = [
        d
        for d in app.data_types().values()
        if not d.get("appLogic") and d.get("id") != PDF_DATA_TYPE and APP_OWNED not in (_contributors(d) or [])
    ]
    checks.check("an attachment data type", bool(attachments))
    found = attachments[0] if attachments else {}
    checks.check(
        "attachment content types", sorted(found.get("allowedContentTypes") or []) == sorted(spec["content_types"])
    )
    checks.check(f"attachment maxSize {spec['max_size']}", found.get("maxSize") == spec["max_size"])
    counts = (found.get("minCount"), found.get("maxCount"))
    checks.check(
        f"attachment counts {spec['min_count']}-{spec['max_count']}", counts == (spec["min_count"], spec["max_count"])
    )
    key = "taskIds" if view.v9 else "taskId"
    bound = view.data_task is not None and view.data_task in view.task_ids(found)
    checks.check(f"attachment bound with {key}", bound)


def _validation(view: _View, checks: Checks) -> None:
    app, rubric = view.app, view.rubric
    for title in rubric.required_fields:
        found = view.fields(title)
        checks.check(
            f"{_short(title)} is required",
            bool(found) and all(c.get("required") not in (None, False) for _, c in found),
        )
    for spec in rubric.patterns:
        schemas = [app.field_schema(data_type, path) for data_type, path in view.paths(spec["field"])]
        patterns = [schema[0].get("pattern") for schema in schemas if schema]
        ok = any(
            p and all(re.search(p, v) for v in spec["accepts"]) and not any(re.search(p, v) for v in spec["rejects"])
            for p in patterns
        )
        checks.check(f"{_short(spec['field'])} has the right pattern", ok)
    config = app.validation.get(view.form_type or "", {})
    rules = expressions.validation_rules(config)
    for case in rubric.expression_validations:
        label = f"{'fails' if case['fails'] else 'passes'} for {list(case['values'].values())}"
        checks.check(label, bool(rules) and _validation_fails(view, rules, case["values"]) == case["fails"])
    messages = {rule.message for rule in rules if isinstance(rule.message, str) and rule.message}
    for language in rubric.languages:
        checks.none(f"validation messages in {language}", (k for k in messages if k not in app.texts.get(language, {})))
    flags = [(app.appsettings.get("AppSettings") or {}).get(f) for f in ("RequiredValidation", "ExpressionValidation")]
    if view.v9:
        checks.check("v9: backend checks not turned off", False not in flags)
    else:
        checks.check("v8: backend checks turned on", flags == [True, True])


def _validation_fails(view: _View, rules: list[expressions.ValidationRule], values: dict[str, Any]) -> bool | None:
    """Whether a rule in the validation file gives an error for these values."""
    data = {path: value for title, value in values.items() for _, path in view.paths(title)}
    context = _form(view.form_type, data)
    results = []
    for rule in rules:
        if rule.severity != "error":
            continue
        try:
            results.append(rule.reports(context))
        except expressions.Unsupported, expressions.ExpressionError, RecursionError:
            results.append(None)
    return True if True in results else None if None in results else False


def _code_lists(view: _View, checks: Checks) -> None:
    app, rubric = view.app, view.rubric
    if titles := rubric.shared_code_list:
        shared = [c for title in titles for _, c in view.fields(title)]
        ids = {c.get("optionsId") for c in shared}
        checks.check(
            "yes/no questions share a code list file",
            len(shared) >= len(titles) and len(ids) == 1 and ids <= set(app.options),
        )
        labels = sorted(view.label(o) for o in view.options(shared[0])) if shared else []
        checks.check("the shared list is Ja and Nei", labels == ["ja", "nei"])
    for title in rubric.code_list_files:
        found = view.fields(title)
        checks.check(
            f"{_short(title)} has a code list file",
            bool(found) and all(c.get("optionsId") in app.options for _, c in found),
        )
    labels = _option_labels(app)
    for language in rubric.languages:
        checks.none(
            f"code list labels are texts in {language}",
            (label for label in labels if label not in app.texts.get(language, {})),
        )


def _data_model(view: _View, checks: Checks) -> None:
    app = view.app
    tasks = {t.id for t in app.process.tasks()}
    for type_id, data_type in app.data_types().items():
        if class_ref := (data_type.get("appLogic") or {}).get("classRef"):
            files = {f"App/models/{type_id}.{suffix}" for suffix in ("schema.json", "cs", "xsd")}
            checks.check(f"{type_id}: schema, C# and XSD files", files <= app.files)
            source = _read(app.root / f"App/models/{type_id}.cs" if app.root else None)
            namespace, _, name = class_ref.rpartition(".")
            declared = re.search(rf"namespace\s+{re.escape(namespace)}\b", source) and re.search(
                rf"class\s+{re.escape(name)}\b", source
            )
            checks.check(f"{type_id}: classRef names the class", bool(declared))
            names = property_names(app.models.get(type_id) or {})
            checks.none(
                f"{type_id}: C# has each field",
                (n for n in names if not re.search(rf"\b{re.escape(n)}\b", source, re.IGNORECASE)),
            )
        checks.none(f"{type_id}: its tasks exist", (t for t in view.task_ids(data_type) if t and t not in tasks))
    for title in view.rubric.numeric_fields:
        schemas = [app.field_schema(data_type, path) for data_type, path in view.paths(title)]
        checks.check(
            f"{_short(title)} is a number",
            bool(schemas) and all(s and s[0].get("type") in ("number", "integer") for s in schemas),
        )


def _references(view: _View, checks: Checks) -> None:
    app = view.app
    checks.none(
        "every binding is in its data model",
        (
            f"{f.name}/{c.get('id')}"
            for f, _, c in app.all_components()
            for key in c.get("dataModelBindings") or {}
            if (b := binding(c, key)) is not None and app.field_schema(b[0] or f.data_type, b[1]) is None
        ),
    )
    checks.none(
        "every dataModel path exists",
        (
            path
            for f in app.folders.values()
            for e in _expressions_in(f.components())
            for path, data_type in expressions.data_model_refs(e)
            if app.field_schema(data_type or f.data_type, path) is None
        ),
    )
    options = {c.get("optionsId") for _, _, c in app.all_components() if c.get("optionsId")}
    checks.none(
        "every optionsId has a code list",
        (o for o in options if o not in app.options and not str(o).startswith("lib**")),
    )
    named = {f.data_type for f in app.folders.values() if f.data_type} | set(app.prefill) | set(app.validation)
    for node in app.process.nodes.values():
        named |= set(node.texts("signatureConfig/dataTypesToSign/dataType"))
        named |= {t for t in (node.text("signatureConfig/signatureDataType"), node.text("connectedDataTypeId")) if t}
    checks.none("every named data type exists", named - set(app.data_types()))
    tasks = {t.id for t in app.process.tasks()} | {RECEIPT_TASK}
    folders = {t for f in app.folders.values() for t in f.tasks if f.settings.get("type") != "subform"}
    policy = {r["urn:altinn:task"] for rule in app.rules for r in rule.resources if r.get("urn:altinn:task")}
    checks.none("every task a folder or rule names exists", (folders | policy) - tasks)


def _schema_valid(view: _View, checks: Checks) -> None:
    from agents.altinn.layout.schema_validator import validate_layout_json

    schemas = _schemas(view.version)
    if schemas is None:
        checks.check("layout schema available", None)
        return
    (layout, settings), referenced = schemas
    for folder in view.app.folders.values():
        for page, data in folder.pages.items():
            result = validate_layout_json(data, layout, referenced)
            checks.check(f"{folder.name}/{page} is valid", result.get("status") == "validation_passed")
        result = validate_layout_json(folder.settings, settings, referenced)
        checks.check(f"{folder.name}/Settings.json is valid", result.get("status") == "validation_passed")


_SCHEMAS: dict[int, Any] = {}


def _schemas(version: int) -> Any:
    """The layout and layout settings schemas the assistant uses for the version, and the expression schema they
    refer to."""
    if version in _SCHEMAS:
        return _SCHEMAS[version]
    import httpx

    from agents.altinn.app_version import get_app_version_profile

    layout = get_app_version_profile(version).layout_schema_location

    def load(name: str) -> Any:
        location = layout.replace("layout.schema.v1.json", f"{name}.schema.v1.json")
        if location.startswith("https://"):
            return httpx.get(location, timeout=30).raise_for_status().json()
        return json.loads(Path(location).read_text(encoding="utf-8"))

    try:
        expression = load("expression")
        _SCHEMAS[version] = ((load("layout"), load("layoutSettings")), {expression.get("$id", ""): expression})
    except Exception:  # An unreachable schema leaves the check unmeasured
        _SCHEMAS[version] = None
    return _SCHEMAS[version]


def _version_conformance(view: _View, checks: Checks) -> None:
    app = view.app
    kinds = {c.get("type") for _, _, c in app.all_components()}
    types = list(app.data_types().values())
    has_sets = "App/ui/layout-sets.json" in app.files
    if view.v9:
        checks.check("v9: no layout-sets.json", not has_sets)
        checks.none(
            "v9: no rule files", (f for f in app.files if f.endswith(("RuleConfiguration.json", "RuleHandler.js")))
        )
        checks.none("v9: no v8 components", kinds & {"Header", "FileUploadWithTag"})
        checks.check("v9: no taskId", not any("taskId" in d for d in types))
        checks.check(
            "v9: no enablePdfCreation or eFormidling",
            not any(d.get("enablePdfCreation") for d in types) and "eFormidling" not in app.metadata,
        )
        checks.none(
            "v9: each folder has a defaultDataType",
            (f.name for f in app.folders.values() if f.pages and not f.data_type),
        )
    else:
        sets = {s.get("id") for s in (app.layout_sets or {}).get("sets") or []}
        checks.check("v8: has layout-sets.json", has_sets)
        checks.none("v8: layout-sets.json lists each folder", set(app.folders) - sets)
        checks.none("v8: no v9 components", kinds & {"Heading"})
        checks.check("v8: no taskIds", not any("taskIds" in d for d in types))
        checks.check("v8: no App/ui/Settings.json", "App/ui/Settings.json" not in app.files)


def _scaffold_intact(view: _View, checks: Checks) -> None:
    template = TEMPLATES_DIR / view.template / "src"
    root = view.app.root or Path()
    for relative in ("Dockerfile", "App.sln", "deployment/values.yaml"):
        checks.check(f"{relative} is the template's", _read(root / relative) == _read(template / relative))
    pattern = r'<(?:PackageReference Include="Altinn\.App\.[^"]+" Version="[^"]+"|TargetFramework>[^<]+)'
    project = [re.findall(pattern, _read(base / "App" / "App.csproj")) for base in (root, template)]
    checks.check("App.csproj keeps its libraries and framework", project[0] == project[1])


AREAS = {
    "bench_texts": _texts,
    "bench_layouts": _layouts,
    "bench_expressions": _expressions,
    "bench_process": _process,
    "bench_signing": _signing,
    "bench_policy": _policy,
    "bench_prefill": _prefill,
    "bench_settings": _settings,
    "bench_validation": _validation,
    "bench_code_lists": _code_lists,
    "bench_data_model": _data_model,
    "bench_references": _references,
    "bench_schema_valid": _schema_valid,
    "bench_version_conformance": _version_conformance,
    "bench_scaffold_intact": _scaffold_intact,
}
SCORE_NAMES = tuple(AREAS)


def evaluate(app: AppModel, rubric: SkillRubric, template: str) -> list[Score]:
    """One score for each skill, for an app made from `template`."""
    view = _View(app, rubric, template)
    scores = []
    for name, area in AREAS.items():
        checks = Checks(name)
        area(view, checks)
        if (score := checks.score()) is not None:
            scores.append(score)
    return scores
