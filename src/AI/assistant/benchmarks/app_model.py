"""Load the files of a v8 or v9 app that the bench scores."""

from __future__ import annotations

import json
import re
import unicodedata
import xml.etree.ElementTree as ElementTree
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agents.altinn.app_version import detect_app_major_version
from agents.altinn.layout.components import layout_components

# Component types that collect user input.  Used both for counting
# fields and for collecting the field titles the rubric matches on.
INPUT_COMPONENT_TYPES = {
    "Input",
    "TextArea",
    "RadioButtons",
    "Checkboxes",
    "Dropdown",
    "Datepicker",
    "DatePicker",
    "FileUpload",
    "FileUploadWithTag",
    "MultipleSelect",
    "List",
    "Address",
}

BPMN = "{http://www.omg.org/spec/BPMN/20100524/MODEL}"
BPMNDI = "{http://www.omg.org/spec/BPMN/20100524/DI}"
ALTINN = "{http://altinn.no/process}"
XACML = "{urn:oasis:names:tc:xacml:3.0:core:schema:wd-17}"


@dataclass
class UiFolder:
    """One folder under `App/ui/`: a layout set in v8, a task's folder in v9."""

    name: str
    settings: dict[str, Any]
    pages: dict[str, dict[str, Any]]
    data_type: str | None = None
    tasks: tuple[str, ...] = ()

    @property
    def order(self) -> list[str]:
        order = (self.settings.get("pages") or {}).get("order")
        return [page for page in order if isinstance(page, str)] if isinstance(order, list) else []

    def components(self, page: str | None = None) -> list[dict[str, Any]]:
        names = [page] if page else list(self.pages)
        return [c for name in names for c in layout_components(self.pages.get(name)) or []]


@dataclass
class Node:
    """A start or end event, a task or a gateway in `process.bpmn`."""

    id: str
    kind: str
    extension: ElementTree.Element | None
    default: str | None = None

    @property
    def task_type(self) -> str | None:
        return self.text("taskType")

    def text(self, path: str) -> str | None:
        found = self.find(path)
        return found.text.strip() if found is not None and found.text else None

    def find(self, path: str) -> ElementTree.Element | None:
        if self.extension is None:
            return None
        return self.extension.find("/".join(f"{ALTINN}{part}" for part in path.split("/")))

    def texts(self, path: str) -> list[str]:
        if self.extension is None:
            return []
        found = self.extension.findall("/".join(f"{ALTINN}{part}" for part in path.split("/")))
        return [element.text.strip() for element in found if element.text]


@dataclass
class Flow:
    id: str
    source: str
    target: str
    condition: Any = None
    has_condition: bool = False


@dataclass
class Process:
    nodes: dict[str, Node] = field(default_factory=dict)
    flows: dict[str, Flow] = field(default_factory=dict)
    shapes: set[str] = field(default_factory=set)

    def tasks(self, task_type: str | None = None) -> list[Node]:
        return [
            n
            for n in self.nodes.values()
            if n.kind in ("task", "serviceTask") and (task_type is None or n.task_type == task_type)
        ]

    @property
    def start(self) -> str:
        """The id of the start event, or "" when there is none."""
        return next((n.id for n in self.nodes.values() if n.kind == "startEvent"), "")

    def is_task(self, node_id: str, task_type: str) -> bool:
        """Whether the element is a task of this type. A flow can point at an element that does not exist."""
        node = self.nodes.get(node_id)
        return node is not None and node.task_type == task_type

    def outgoing(self, node_id: str) -> list[Flow]:
        return [flow for flow in self.flows.values() if flow.source == node_id]

    def reachable(self, start: str) -> list[str]:
        """Node ids reachable from `start`, nearest first, `start` excluded."""
        seen: list[str] = []
        queue = [flow.target for flow in self.outgoing(start)]
        while queue:
            node = queue.pop(0)
            if node in seen or node == start:
                continue
            seen.append(node)
            queue.extend(flow.target for flow in self.outgoing(node))
        return seen


@dataclass
class Rule:
    """One XACML rule: who, on what, may do which actions."""

    id: str
    subjects: list[tuple[str, str]]
    resources: list[dict[str, str]]
    actions: set[str]
    any_of_count: int

    @property
    def scoped(self) -> list[dict[str, str]]:
        """The resources that name a task or an end event. A rule without them applies in every state."""
        return [r for r in self.resources if "urn:altinn:task" in r or "urn:altinn:end-event" in r]

    def covers_task(self, task: str | None) -> bool:
        """Whether the rule applies in `task`. None asks for a rule without a task, which instantiate needs."""
        if not self.scoped:
            return True
        return any(r.get("urn:altinn:task", "").lower() == (task or "").lower() for r in self.scoped if task)

    def covers_end_event(self) -> bool:
        return not self.scoped or any("urn:altinn:end-event" in r for r in self.scoped)


@dataclass
class AppModel:
    """The files of one app that the scores read."""

    root: Path | None = None
    version: int = 8
    files: set[str] = field(default_factory=set)
    metadata: dict[str, Any] = field(default_factory=dict)
    texts: dict[str, dict[str, dict[str, Any]]] = field(default_factory=dict)
    text_files: dict[str, dict[str, Any]] = field(default_factory=dict)
    folders: dict[str, UiFolder] = field(default_factory=dict)
    layout_sets: dict[str, Any] | None = None
    ui_settings: dict[str, Any] = field(default_factory=dict)
    process: Process = field(default_factory=Process)
    process_error: str | None = None
    rules: list[Rule] = field(default_factory=list)
    policy_text: str = ""
    policy_error: str | None = None
    options: dict[str, Any] = field(default_factory=dict)
    models: dict[str, dict[str, Any]] = field(default_factory=dict)
    prefill: dict[str, dict[str, Any]] = field(default_factory=dict)
    validation: dict[str, dict[str, Any]] = field(default_factory=dict)
    appsettings: dict[str, Any] = field(default_factory=dict)

    @property
    def data_task(self) -> str | None:
        """The first data task after the start event."""
        return next((n for n in self.process.reachable(self.process.start) if self.process.is_task(n, "data")), None)

    @property
    def form(self) -> UiFolder | None:
        """The UI folder of the data task. Without one, the folder with the longest page order."""
        found = self.folder_for_task(self.data_task or "")
        return found or max(self.folders.values(), key=lambda f: len(f.order), default=None)

    @property
    def page_order(self) -> list[str]:
        return self.form.order if self.form else []

    def input_components(self) -> list[dict[str, Any]]:
        """The form's components that collect input."""
        components = self.form.components() if self.form else []
        return [c for c in components if isinstance(c, dict) and c.get("type") in INPUT_COMPONENT_TYPES]

    def fields(self, title: str) -> list[tuple[UiFolder, dict[str, Any]]]:
        """The form's input components with this title. A field on the PDF page or the receipt is not one."""
        form = self.form
        if form is None:
            return []
        return match_title(title, ((self.title_of(c) or "", (form, c)) for c in self.input_components()))

    def title_of(self, component: dict[str, Any]) -> str | None:
        """The nb text of a component's title, or its text key when there is no text."""
        key = (component.get("textResourceBindings") or {}).get("title")
        if not isinstance(key, str) or not key.strip():
            return None
        return self.text(key) or key

    def text(self, key: Any, language: str = "nb") -> str | None:
        if not isinstance(key, str):
            return None
        entry = self.texts.get(language, {}).get(key)
        return str(entry.get("value", "")) if entry else None

    def data_types(self) -> dict[str, dict[str, Any]]:
        return {d["id"]: d for d in self.metadata.get("dataTypes") or [] if isinstance(d, dict) and "id" in d}

    def folder_for_task(self, task_id: str) -> UiFolder | None:
        for folder in self.folders.values():
            if task_id in folder.tasks:
                return folder
        return None

    def all_components(self) -> Iterator[tuple[UiFolder, str, dict[str, Any]]]:
        for folder in self.folders.values():
            for page in folder.pages:
                for component in folder.components(page):
                    if isinstance(component, dict):
                        yield folder, page, component

    def field_schema(self, data_type: str | None, path: str) -> tuple[dict[str, Any], bool] | None:
        """The schema of a data model field, and whether the path passes through a list."""
        schema = self.models.get(data_type or "")
        if schema is None:
            return None
        node = _resolve(schema, schema)
        in_list = False
        for part in re.sub(r"\[\d*\]", "", path).split("."):
            while node.get("type") == "array" or "items" in node:
                in_list = True
                node = _resolve(schema, node.get("items") or {})
            properties = node.get("properties") or {}
            if part not in properties:
                return None
            node = _resolve(schema, properties[part])
        return node, in_list


def binding(component: dict[str, Any], key: str = "simpleBinding") -> tuple[str | None, str] | None:
    """A data model binding as (data type, path). The data type is None for the folder's default."""
    value = (component.get("dataModelBindings") or {}).get(key)
    if isinstance(value, str):
        return None, value
    if isinstance(value, dict) and isinstance(value.get("field"), str):
        return value.get("dataType"), value["field"]
    return None


def property_names(schema: dict[str, Any]) -> set[str]:
    """The name of every property in a data model schema, at any depth."""
    names: set[str] = set()
    stack, seen = [_resolve(schema, schema)], []
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.append(node)
        for name, child in (node.get("properties") or {}).items():
            names.add(name)
            resolved = _resolve(schema, child)
            stack.append(_resolve(schema, resolved["items"]) if "items" in resolved else resolved)
    return names


# A $ref chain longer than this is a cycle
_MAX_REF_DEPTH = 20


def _resolve(root: dict[str, Any], node: Any) -> dict[str, Any]:
    """Follow `$ref` and a single-entry `oneOf`/`allOf` to the schema they stand for."""
    for _ in range(_MAX_REF_DEPTH):
        if not isinstance(node, dict):
            return {}
        ref = node.get("$ref")
        wrapped = node.get("oneOf") or node.get("allOf")
        if isinstance(ref, str) and ref.startswith("#/"):
            target: Any = root
            for part in ref[2:].split("/"):
                target = target.get(part, {}) if isinstance(target, dict) else {}
            node = target
        elif isinstance(wrapped, list) and len(wrapped) == 1 and "properties" not in node:
            node = wrapped[0]
        else:
            return node
    return {}


def _json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except OSError, ValueError:
        return None


def load_app(root: Path) -> AppModel:
    """Load the app at `root` (repo root containing `App/`)."""
    app_dir = root / "App"
    model = AppModel(root=root, version=detect_app_major_version(str(root)))
    model.files = {str(p.relative_to(root)) for p in root.rglob("*") if p.is_file() and ".git" not in p.parts}
    model.metadata = _json(app_dir / "config" / "applicationmetadata.json") or {}
    model.appsettings = _json(app_dir / "appsettings.json") or {}

    for path in sorted((app_dir / "config" / "texts").glob("resource.*.json")):
        data = _json(path)
        if isinstance(data, dict):
            language = path.name.split(".")[1]
            model.text_files[language] = data
            model.texts[language] = {
                e["id"]: e for e in data.get("resources") or [] if isinstance(e, dict) and isinstance(e.get("id"), str)
            }

    sets = _json(app_dir / "ui" / "layout-sets.json")
    model.layout_sets = sets if isinstance(sets, dict) else None
    # v9 ignores a leftover layout-sets.json, so only v8 reads its sets.
    v8 = model.version < 9
    model.ui_settings = (
        ((model.layout_sets or {}).get("uiSettings") or {}) if v8 else (_json(app_dir / "ui" / "Settings.json") or {})
    )
    declared = {s.get("id"): s for s in (model.layout_sets or {}).get("sets") or [] if isinstance(s, dict)}
    for settings_path in sorted((app_dir / "ui").glob("*/Settings.json")):
        folder_dir = settings_path.parent
        settings = _json(settings_path) or {}
        pages = {
            p.stem: data for p in sorted((folder_dir / "layouts").glob("*.json")) if (data := _json(p)) is not None
        }
        if v8:
            entry = declared.get(folder_dir.name) or {}
            folder = UiFolder(folder_dir.name, settings, pages, entry.get("dataType"), tuple(entry.get("tasks") or ()))
        else:
            folder = UiFolder(folder_dir.name, settings, pages, settings.get("defaultDataType"), (folder_dir.name,))
        model.folders[folder.name] = folder

    model.options = {
        p.stem: data for p in sorted((app_dir / "options").glob("*.json")) if (data := _json(p)) is not None
    }
    for path in sorted((app_dir / "models").glob("*.json")):
        name, _, kind = path.name.partition(".")
        data = _json(path)
        if not isinstance(data, dict):
            continue
        {"schema.json": model.models, "prefill.json": model.prefill, "validation.json": model.validation}.get(kind, {})[
            name
        ] = data

    _load_process(model, app_dir / "config" / "process" / "process.bpmn")
    _load_policy(model, app_dir / "config" / "authorization" / "policy.xml")
    return model


def _load_process(model: AppModel, path: Path) -> None:
    try:
        tree = ElementTree.parse(path).getroot()
    except (OSError, ElementTree.ParseError) as error:
        model.process_error = str(error)
        return
    process = Process()
    for element in tree.iter():
        tag = element.tag
        if not tag.startswith(BPMN):
            if tag == f"{BPMNDI}BPMNShape" or tag == f"{BPMNDI}BPMNEdge":
                process.shapes.add(element.get("bpmnElement", ""))
            continue
        kind = tag.removeprefix(BPMN)
        if kind == "sequenceFlow":
            condition = element.find(f"{BPMN}conditionExpression")
            text = (condition.text or "").strip() if condition is not None else ""
            try:
                parsed = json.loads(text) if text else None
            except ValueError:
                parsed = text
            process.flows[element.get("id", "")] = Flow(
                element.get("id", ""), element.get("sourceRef", ""), element.get("targetRef", ""), parsed, bool(text)
            )
        elif kind in ("startEvent", "endEvent", "task", "serviceTask", "exclusiveGateway"):
            extension = element.find(f"{BPMN}extensionElements")
            inner = next(iter(extension), None) if extension is not None else None
            process.nodes[element.get("id", "")] = Node(element.get("id", ""), kind, inner, element.get("default"))
    model.process = process


def _load_policy(model: AppModel, path: Path) -> None:
    try:
        model.policy_text = path.read_text(encoding="utf-8-sig")
        root = ElementTree.fromstring(model.policy_text)
    except (OSError, ElementTree.ParseError) as error:
        model.policy_error = str(error)
        return
    for rule in root.iter(f"{XACML}Rule"):
        subjects: list[tuple[str, str]] = []
        resources: list[dict[str, str]] = []
        actions: set[str] = set()
        any_ofs = rule.findall(f"{XACML}Target/{XACML}AnyOf")
        for any_of in any_ofs:
            for all_of in any_of.findall(f"{XACML}AllOf"):
                matches = {}
                category = ""
                for match in all_of.findall(f"{XACML}Match"):
                    value = match.findtext(f"{XACML}AttributeValue", "").strip()
                    designator = match.find(f"{XACML}AttributeDesignator")
                    if designator is None:
                        continue
                    matches[designator.get("AttributeId", "")] = value
                    category = designator.get("Category", "")
                if category.endswith("access-subject"):
                    subjects.extend((attribute, value.lower()) for attribute, value in matches.items())
                elif category.endswith("resource"):
                    resources.append(matches)
                elif category.endswith("action"):
                    actions.update(value.lower() for value in matches.values())
        model.rules.append(Rule(rule.get("RuleId", ""), subjects, resources, actions, len(any_ofs)))


_WHITESPACE_RE = re.compile(r"\s+")
_NOISE_RE = re.compile(r"[^0-9a-zæøå ]")
# Leading enumeration like "A.1 ", "B2. ", "1.2.3 " — form titles often
# carry these while the source PDF (or another run) doesn't.  The token
# must contain a digit (so real words are never stripped) and end at
# whitespace.
_ENUMERATION_RE = re.compile(r"^(?=[a-zæøå0-9.)]*\d)[a-zæøå]?[\d.)]+\s+")


def normalize_title(text: str) -> str:
    """Normalize a field title for cross-run comparison."""
    text = unicodedata.normalize("NFKC", text).lower().strip()
    text = _ENUMERATION_RE.sub("", text)
    text = _NOISE_RE.sub(" ", text)
    return _WHITESPACE_RE.sub(" ", text).strip()


# A title that has all the words of another matches it only when it is at least this share of the other's length,
# so «Navn» does not match every title with a name in it.
SIMILAR_TITLE_MIN_SHARE = 0.3


def match_title[T](title: str, candidates: Iterable[tuple[str, T]]) -> list[T]:
    """The candidates with this title: the same text, else the same field number, else the same words."""
    wanted, number = normalize_title(title), _field_number(title)
    exact: list[T] = []
    numbered: list[T] = []
    similar: list[T] = []
    for text, candidate in candidates:
        have = normalize_title(text)
        if not have or not wanted:
            continue
        share = min(len(have), len(wanted)) / max(len(have), len(wanted))
        if have == wanted:
            exact.append(candidate)
        elif number and _field_number(text) == number:
            numbered.append(candidate)
        # A name and number field can be split in two, and each half has some of the title's words
        elif _same_words(have, wanted) and share >= SIMILAR_TITLE_MIN_SHARE:
            similar.append(candidate)
    return exact or numbered or similar


def _field_number(title: str) -> str | None:
    """The number a numbered form gives a field, such as "a5" in «A5. Kontaktinformasjon»."""
    found = re.match(r"\s*([A-Za-z]?\d+(?:\.\d+)*)[.)]?\s", title)
    return found.group(1).lower() if found else None


def _same_words(have: str, wanted: str) -> bool:
    """One title has all the words of the other."""
    return set(have.split()) <= set(wanted.split()) or set(wanted.split()) <= set(have.split())
