"""The scores of a built app, one for each skill and a few for the whole app."""

from __future__ import annotations

import functools
import itertools
import re
from collections.abc import Callable, Iterable, Iterator
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

from agents.altinn.app_version import AppVersionProfile, get_app_version_profile
from agents.altinn.layout import get_layout_schema, get_referenced_schemas
from agents.altinn.layout.components import has_navigation, text_key_bindings
from agents.altinn.layout.schema_validator import validate_layout_json
from shared.config.base_config import get_config

from .app_model import AppModel, Flow, Rule, UiFolder, binding, normalize_title, property_names
from .app_templates import template_source
from .evaluators import Score

SERVICE_TASK_TYPES = {"pdf", "subformPdf", "eFormidling", "fiksArkiv"}
SERVICE_OWNER = "urn:altinn:org"
PDF_DATA_TYPE = "ref-data-as-pdf"
APP_OWNED = "app:owned"
# A v8 layout set and a v9 UI folder name the custom receipt as this task
RECEIPT_TASK = "CustomReceipt"
DEFAULT_LANGUAGE = "nb"

# How much of a field title a check's label shows, and how many items a score's comment names.
LABEL_LENGTH = 20
COMMENT_FOUND = 4
COMMENT_FAILED = 12
COMMENT_SKIPPED = 6

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
class Rubric:
    """What an item asks for, from its expectedOutput. A field the item leaves out turns its checks off."""

    expected_pages: int = 0
    min_input_components: int = 0
    expected_titles: list[str] = field(default_factory=list)
    navigation_required: bool = False
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
    def parse(cls, expected_output: dict[str, Any]) -> Rubric:
        """A key that no check reads fails, so that a misspelled key cannot turn its checks off unseen."""
        names = {f.name for f in fields(cls)}
        unknown = set(expected_output) - names - {"rubric_version"}
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
    rubric: Rubric
    template: str

    @property
    def profile(self) -> AppVersionProfile:
        return self.app.profile

    @property
    def v9(self) -> bool:
        return self.profile.major_version >= 9

    def task_after(self, kind: str) -> str | None:
        """The nearest task of a type after the data task."""
        process = self.app.process
        return next((n for n in process.reachable(self.app.data_task or "") if process.is_task(n, kind)), None)

    @property
    def form_type(self) -> str | None:
        return self.app.form.data_type if self.app.form else None

    def task_ids(self, data_type: dict[str, Any]) -> list[Any]:
        """The tasks of a data type, under the key the version reads."""
        tasks = data_type.get(self.profile.data_type_tasks_key)
        return tasks if isinstance(tasks, list) else [tasks] if tasks else []

    def paths(self, title: str) -> set[tuple[str | None, str]]:
        """(data type, path) of the fields with this title."""
        return {(b[0] or f.data_type, b[1]) for f, c in self.app.fields(title) if (b := binding(c)) is not None}

    def options(self, component: dict[str, Any]) -> list[dict[str, Any]]:
        found = component.get("options") or self.app.options.get(component.get("optionsId") or "")
        return found if isinstance(found, list) else []

    def label(self, option: dict[str, Any]) -> str:
        return normalize_title(self.app.text(option.get("label")) or str(option.get("label")))


def _short(title: str) -> str:
    return title[:LABEL_LENGTH]


@functools.cache
def _known_functions() -> frozenset[str]:
    """The functions the v9 expression schema defines: every function app-frontend or the app backend has."""
    schema = get_layout_schema(str(get_config().LAYOUT_SCHEMA_V9_DIR / "expression.schema.v1.json"))
    return frozenset(
        items[0]["const"]
        for name, definition in schema["definitions"].items()
        if name.startswith("func-") and isinstance(items := definition.get("items"), list) and "const" in items[0]
    )


def _calls(expression: Any) -> Iterator[list[Any]]:
    if isinstance(expression, list) and expression and isinstance(expression[0], str):
        yield expression
        for arg in expression[1:]:
            yield from _calls(arg)


def _data_model_refs(expression: Any) -> list[tuple[str, str | None]]:
    """(path, data type) for each dataModel call with a literal path."""
    refs = [
        (call[1], call[2] if len(call) > 2 and isinstance(call[2], str) else None)
        for call in _calls(expression)
        if call[0] == "dataModel" and len(call) > 1 and isinstance(call[1], str)
    ]
    return list(dict.fromkeys(refs))


def _reads(expression: Any) -> set[str]:
    """The component IDs and data model paths the expression reads."""
    return {
        call[1]
        for call in _calls(expression)
        if call[0] in ("component", "dataModel") and len(call) > 1 and isinstance(call[1], str)
    }


def _literals(expression: Any) -> set[str]:
    """The strings and numbers in the expression, without the function names."""
    if isinstance(expression, list):
        args = expression[1:] if expression and isinstance(expression[0], str) else expression
        return set().union(*(_literals(arg) for arg in args))
    return {_as_text(expression)} if isinstance(expression, str | int | float) else set()


def _as_text(value: Any) -> str:
    """A value as an expression writes it, so that true is true and not True."""
    return str(value).lower() if isinstance(value, bool) else str(value)


def _numbers(expression: Any) -> set[float]:
    return {float(literal) for literal in _literals(expression) if re.fullmatch(r"-?\d+(\.\d+)?", literal)}


def _expressions_in(value: Any, expected: bool = False) -> Iterable[Any]:
    """Every expression in a JSON value: a list with a known function first, or a list where only one can be."""
    named = isinstance(value, list) and bool(value) and isinstance(value[0], str)
    if named and (expected or value[0] in _known_functions()):
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


def _form(view: _View, checks: Checks) -> None:
    app, rubric, form = view.app, view.rubric, view.app.form
    if expected := rubric.expected_pages:
        found = len(app.page_order)
        checks.check(f"{expected} pages in pages.order, found {found}", found == expected)
    if form and rubric.navigation_required and len(form.order) > 1:
        for page in form.order:
            checks.check(f"{page} has navigation", has_navigation(form.components(page)))
    if expected := rubric.min_input_components:
        found = len(app.input_components())
        checks.check(f"at least {expected} input fields, found {found}", found >= expected)


def _field_coverage(view: _View, checks: Checks) -> None:
    for title in view.rubric.expected_titles:
        checks.check(f"has {_short(title)}", bool(view.app.fields(title)))


def _texts(view: _View, checks: Checks) -> None:
    app = view.app
    used = {key for _, _, c in app.all_components() for key in text_key_bindings(c).values()} | _option_labels(app)
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
        uploads = {c.get("id") for c in _components(view.app.form) if c.get("type") == "FileUpload"}
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
    texts = {app.text(key) or "" for c in _components(receipt) for key in text_key_bindings(c).values()}
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
    heading = view.profile.heading_component
    checks.check(f"PDF page has a {heading}", any(c.get("type") == heading for c in _components(folder, page)))


def _components(folder: UiFolder | None, page: str | None = None) -> list[dict[str, Any]]:
    return folder.components(page) if folder else []


def _read_by(view: _View, folder: UiFolder | None, page: str | None = None) -> set[tuple[str | None, str]]:
    """The data model fields a folder or a page shows: its bindings, its summaries' targets and its text variables."""
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
    keys = {key for c in _components(folder, page) for key in text_key_bindings(c).values()}
    entries = [view.app.texts.get(DEFAULT_LANGUAGE, {}).get(k) or {} for k in keys]
    return {
        v.get("key")
        for entry in entries
        for v in entry.get("variables") or []
        if str(v.get("dataSource", "")).startswith("dataModel.")
    }


def _expressions(view: _View, checks: Checks) -> None:
    app, profile = view.app, view.profile
    for pair in view.rubric.conditional_fields:
        label = f"{_short(pair['field'])} shows only for {pair['shown_for']} in {_short(pair['controller'])}"
        checks.check(label, _shows_only_for(view, pair))
    in_forms = _expressions_in([*(f.pages for f in app.folders.values()), *app.validation.values()])
    in_gateways = (e for flow in app.process.flows.values() for e in _expressions_in(flow.condition, expected=True))
    missing = _missing_functions(
        in_forms, profile.missing_expression_functions | profile.missing_frontend_expression_functions
    )
    missing |= _missing_functions(in_gateways, profile.missing_expression_functions)
    checks.none(f"every function exists in {profile.version_label}", missing)


def _missing_functions(found: Iterable[Any], lacking: frozenset[str]) -> set[str]:
    known = _known_functions()
    return {
        call[0] for expression in found for call in _calls(expression) if call[0] not in known or call[0] in lacking
    }


def _shows_only_for(view: _View, pair: dict[str, str]) -> bool | None:
    """Whether a hidden expression that can hide the field reads the controller and names the answer."""
    controllers = view.app.fields(pair["controller"])
    if not controllers:
        return False
    folder, controller = controllers[0]
    bound, options = binding(controller), view.options(controller)
    if bound is None or not options:
        return None
    answer = normalize_title(pair["shown_for"])
    wanted = {_as_text(o.get("value")) for o in options if view.label(o) == answer}
    wanted = wanted or {_as_text(o.get("value")) for o in options if answer in view.label(o).split()}
    dependents = [c for f, c in view.app.fields(pair["field"]) if f is folder]
    if not wanted or not dependents:
        return False
    controller_refs = {controller.get("id"), bound[1]}
    return any(
        controller_refs & _reads(expression) and wanted & _literals(expression)
        for dependent in dependents
        for expression in _hiding(folder, dependent)
    )


def _hiding(folder: UiFolder, component: dict[str, Any]) -> list[Any]:
    """The hidden expressions of the component, of the groups that list it in `children`, and of its page."""
    # A multi-page repeating group lists its children as "page:id"
    parents = {
        child.split(":")[-1]: c
        for c in folder.components()
        for child in c.get("children") or []
        if isinstance(child, str)
    }
    chain = [component]
    while (parent := parents.get(chain[-1].get("id", ""))) is not None and parent not in chain:
        chain.append(parent)
    page = next((p for p in folder.pages if component in folder.components(p)), None)
    page_hidden = (folder.pages[page].get("data") or {}).get("hidden") if page else None
    return [e for e in (*(c.get("hidden") for c in chain), page_hidden) if e is not None]


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
    after_data = [f.target for f in app.process.outgoing(view.app.data_task or "")]
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
    data_types = [data_type for f in outgoing for _, data_type in _data_model_refs(f.condition)]
    checks.check(
        "the gateway names its data type",
        bool(gateway.text("connectedDataTypeId")) or (bool(data_types) and all(data_types)),
    )
    paths = {p for _, p in view.paths(spec["field"])}
    conditions = [f.condition for f in outgoing]
    checks.check(f"each condition reads {_short(spec['field'])}", all(paths & _reads(c) for c in conditions))
    routes = spec["routes"]
    amounts = sorted(routes, key=float)
    # The amounts on each side of the limit, such as 500000 and 500001
    limits = [a for pair in itertools.pairwise(amounts) if routes[pair[0]] != routes[pair[1]] for a in pair]
    if limits:
        checks.check(
            f"each condition compares with {' or '.join(limits)}",
            all({float(a) for a in limits} & _numbers(c) for c in conditions),
        )
    wanted = set(routes.values())
    checks.check(f"the flows go to {' and '.join(sorted(wanted))}", {_leads_to(view, f) for f in outgoing} == wanted)


def _leads_to(view: _View, flow: Flow) -> str:
    """ "signing" when a signing task is ahead of the flow, else "end"."""
    process = view.app.process
    ahead = [flow.target, *process.reachable(flow.target)]
    return "signing" if any(process.is_task(n, "signing") for n in ahead) else "end"


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
        checks.check("a PDF task comes before signing", any(app.process.is_task(n, "pdf") for n in before))
    signature = types.get(node.text("signatureConfig/signatureDataType") or "") or {}
    checks.check("signatureDataType exists", bool(signature))
    checks.check("signature data type is app-owned", _contributors(signature) == [APP_OWNED])
    checks.check("signature data type holds JSON", signature.get("allowedContentTypes") == ["application/json"])
    key = view.profile.data_type_tasks_key
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
    tasks = {
        "data": view.app.data_task,
        "pdf": view.task_after("pdf"),
        "signing": view.task_after("signing"),
        "end": "end",
    }
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
    version = view.profile.major_version
    for entry in view.rubric.prefill:
        if version not in entry.get("versions", [version]):
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
    key = view.profile.data_type_tasks_key
    bound = view.app.data_task is not None and view.app.data_task in view.task_ids(found)
    checks.check(f"attachment bound with {key}", bound)


def _validation(view: _View, checks: Checks) -> None:
    app, rubric = view.app, view.rubric
    for title in rubric.required_fields:
        found = view.app.fields(title)
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
    rules = _validation_rules(app.validation.get(view.form_type or "", {}))
    errors = [(path, rule) for path, rule in rules if (rule.get("severity") or "error") == "error"]
    # A rule reads its own field with ["argv", 0]
    read = [_reads(rule["condition"]) | {path} for path, rule in errors]
    for titles in dict.fromkeys(tuple(case["values"]) for case in rubric.expression_validations):
        wanted = [{p for _, p in view.paths(title)} for title in titles]
        checks.check(
            f"an error rule reads {' and '.join(_short(t) for t in titles)}",
            any(all(paths & reads for paths in wanted) for reads in read),
        )
    messages = {rule["message"] for _, rule in rules if isinstance(rule["message"], str) and rule["message"]}
    for language in rubric.languages:
        checks.none(f"validation messages in {language}", (k for k in messages if k not in app.texts.get(language, {})))
    flags = [(app.appsettings.get("AppSettings") or {}).get(f) for f in ("RequiredValidation", "ExpressionValidation")]
    if view.v9:
        checks.check("v9: backend checks not turned off", False not in flags)
    else:
        checks.check("v8: backend checks turned on", flags == [True, True])


def _validation_rules(config: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """(field, rule) for each rule of a validation file with a condition and a message, with its `ref` filled in."""
    definitions: dict[str, dict[str, Any]] = {}
    for name, definition in (config.get("definitions") or {}).items():
        if isinstance(definition, dict):
            definitions[name] = _with_ref(definition, definitions)
    rules = []
    for path, entries in (config.get("validations") or {}).items():
        for entry in entries if isinstance(entries, list) else []:
            rule = definitions.get(entry, {}) if isinstance(entry, str) else _with_ref(entry, definitions)
            if "condition" in rule and "message" in rule:
                rules.append((path, rule))
    return rules


def _with_ref(rule: Any, definitions: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """A rule's own keys over those of the definition it names in `ref`."""
    if not isinstance(rule, dict):
        return {}
    ref = rule.get("ref")
    return {**(definitions.get(ref, {}) if isinstance(ref, str) else {}), **rule}


def _code_lists(view: _View, checks: Checks) -> None:
    app, rubric = view.app, view.rubric
    if titles := rubric.shared_code_list:
        shared = [c for title in titles for _, c in view.app.fields(title)]
        ids = {c.get("optionsId") for c in shared}
        checks.check(
            "yes/no questions share a code list file",
            len(shared) >= len(titles) and len(ids) == 1 and ids <= set(app.options),
        )
        labels = sorted(view.label(o) for o in view.options(shared[0])) if shared else []
        checks.check("the shared list is Ja and Nei", labels == ["ja", "nei"])
    for title in rubric.code_list_files:
        found = view.app.fields(title)
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
            for path, data_type in _data_model_refs(e)
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
    schemas = _schemas(view.app.version)
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


def _schemas(version: int) -> Any:
    """The layout and layout settings schemas the assistant validates with, and the schemas they refer to."""
    layout = get_app_version_profile(version).layout_schema_location
    settings = layout.replace("layout.schema.v1.json", "layoutSettings.schema.v1.json")
    try:
        return (get_layout_schema(layout), get_layout_schema(settings)), get_referenced_schemas(layout)
    except Exception:  # An unreachable schema leaves the check unmeasured
        return None


def _version_conformance(view: _View, checks: Checks) -> None:
    """The version's shape. A component of the other version fails bench_schema_valid."""
    app, profile = view.app, view.profile
    types = list(app.data_types().values())
    if profile.forbidden_new_file_patterns:
        label = f"{profile.version_label}: no file the version does not have"
        checks.none(label, (f for f in app.files if profile.forbidden_file(f)))
    if view.v9:
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
        checks.check("v8: has layout-sets.json", "App/ui/layout-sets.json" in app.files)
        checks.none("v8: layout-sets.json lists each folder", set(app.folders) - sets)
        checks.check("v8: no taskIds", not any("taskIds" in d for d in types))
        checks.check("v8: no App/ui/Settings.json", "App/ui/Settings.json" not in app.files)


def _scaffold_intact(view: _View, checks: Checks) -> None:
    template = template_source(view.template)
    root = view.app.root or Path()
    for relative in ("Dockerfile", "App.sln", "deployment/values.yaml"):
        checks.check(f"{relative} is the template's", _read(root / relative) == _read(template / relative))
    pattern = r'<(?:PackageReference Include="Altinn\.App\.[^"]+" Version="[^"]+"|TargetFramework>[^<]+)'
    project = [re.findall(pattern, _read(base / "App" / "App.csproj")) for base in (root, template)]
    checks.check("App.csproj keeps its libraries and framework", project[0] == project[1])


@dataclass(frozen=True)
class Area:
    """The checks behind one score, the component the manifest reports it under, and the skill they are about."""

    check: Callable[[_View, Checks], None]
    component: str
    skill: str = ""
    does: str = ""


AREAS = {
    "bench_form": Area(_form, "build"),
    "bench_field_coverage": Area(_field_coverage, "build"),
    "bench_version_conformance": Area(
        _version_conformance, "app", "studio-app-development", "How the files of an app connect, in v8 and v9."
    ),
    "bench_scaffold_intact": Area(_scaffold_intact, "app"),
    "bench_texts": Area(
        _texts, "texts", "studio-text-resources", "Texts, translations, variables and the language selector."
    ),
    "bench_layouts": Area(
        _layouts, "layouts", "studio-layouts", "UI folders, pages, the custom receipt and the PDF page."
    ),
    "bench_expressions": Area(
        _expressions, "expressions", "studio-expressions", "Expressions that hide fields and route the process."
    ),
    "bench_process": Area(
        _process, "process", "studio-process", "The tasks, the PDF task and the gateway in process.bpmn."
    ),
    "bench_signing": Area(_signing, "signing", "studio-signing", "The signing task, its data types and its pages."),
    "bench_policy": Area(_policy, "policy", "studio-policy", "Who may do what, in which task."),
    "bench_prefill": Area(_prefill, "prefill", "studio-prefill", "Data from Enhetsregisteret and the user profile."),
    "bench_settings": Area(
        _settings, "settings", "studio-app-settings", "Who may start the app, and the attachment's limits."
    ),
    "bench_validation": Area(
        _validation, "validation", "studio-validation", "Required fields, patterns and expression validation."
    ),
    "bench_code_lists": Area(_code_lists, "codelists", "studio-code-lists", "Code list files and their texts."),
    "bench_data_model": Area(
        _data_model, "datamodel", "studio-data-model", "The schema, the C# class and the data types."
    ),
    "bench_references": Area(_references, "build"),
    "bench_schema_valid": Area(_schema_valid, "build"),
}
SCORE_NAMES = tuple(AREAS)


def evaluate(app: AppModel, rubric: Rubric, template: str) -> list[Score]:
    """The scores of an app made from `template`."""
    view = _View(app, rubric, template)
    scores = []
    for name, area in AREAS.items():
        checks = Checks(name)
        area.check(view, checks)
        if (score := checks.score()) is not None:
            scores.append(score)
    return scores
