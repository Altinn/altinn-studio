"""Version-controlled dataset items, upserted into Langfuse."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterator, NamedTuple

from langfuse import get_client

from agents.services.llm.llm_client import build_intent_parse_message
from agents.services.llm.scope_checker import build_scope_check_message
from benchmarks import registry
from benchmarks.lf_api import LangfuseApi

DATASETS_DIR = Path(__file__).parent / "datasets"


REQUIRED_KEYS = {"id", "input", "expectedOutput", "metadata"}


class Dataset(NamedTuple):
    name: str
    prompt: str | None
    description: str
    path: Path
    items: list[dict[str, Any]]
    kind: str = "prompt"


def _read_items(path: Path) -> list[dict[str, Any]]:
    items = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            items.append(json.loads(line))
        except json.JSONDecodeError as e:
            raise ValueError(f"{path.name} line {number}: {e}") from e
    return items


def load_datasets() -> Iterator[Dataset]:
    """Every eval whose items are version controlled, straight from the registry."""
    for entry in registry.with_items_in_repo():
        path = entry.path
        if not path or not path.exists():
            raise FileNotFoundError(
                f"{entry.name} declares {entry.file} and it is not on disk"
            )
        items = _read_items(path)
        yield Dataset(
            name=entry.name,
            prompt=entry.prompt,
            description=entry.langfuse_description(len(items)),
            path=path,
            items=items,
            kind=entry.kind,
        )


MESSAGE_BUILDERS = {
    "scope_check": lambda item: build_scope_check_message(
        item["input"]["goal"], item["input"].get("conversation")
    ),
    "intent_check": lambda item: build_intent_parse_message(
        item["input"]["goal"], item["input"].get("attachments")
    ),
}


def render_input(dataset: Dataset, item: dict[str, Any]) -> dict[str, Any]:
    """The item input as uploaded."""
    if dataset.kind == "planner":
        return item["input"]
    if dataset.kind == "prompt" and item["input"].get("user_message"):
        return item["input"]
    if dataset.kind == "generation":
        from .generation import as_chat_messages

        # `chat_messages` feeds a chat-prompt placeholder; `conversation` is the SDK path.
        return {
            **item["input"],
            "chat_messages": as_chat_messages(item["input"]["conversation"]),
        }
    build = MESSAGE_BUILDERS[dataset.prompt]
    return {**item["input"], "user_message": build(item)}


def validate(dataset: Dataset) -> list[str]:
    problems = []
    shaped = []
    for item in dataset.items:
        missing = REQUIRED_KEYS - item.keys()
        if missing:
            problems.append(f"{dataset.path.name}: item is missing {sorted(missing)}")
            continue
        shaped.append(item)
    if dataset.kind == "prompt" and dataset.prompt not in MESSAGE_BUILDERS:
        if not all(item["input"].get("user_message") for item in shaped):
            problems.append(
                f"{dataset.path.name}: no message builder for '{dataset.prompt}' and "
                "not every item carries a user_message"
            )
    if dataset.kind == "generation":
        problems.extend(_generation_problems(dataset))
    seen: set[str] = set()
    for item in shaped:
        if item["id"] in seen:
            problems.append(f"{dataset.path.name}: duplicate id {item['id']}")
        seen.add(item["id"])
        if not item["metadata"].get("note"):
            problems.append(f"{dataset.path.name}: {item['id']} has no note")
        partner = item["metadata"].get("pairs_with")
        if partner and not any(other["id"] == partner for other in dataset.items):
            problems.append(f"{dataset.path.name}: {item['id']} pairs with missing {partner}")
    return problems


def missing_assets(dataset: Dataset) -> list[str]:
    """Attachments a planner item names that are not on this machine."""
    if dataset.kind != "planner":
        return []
    from .planner import ASSETS_DIR

    problems = []
    for item in dataset.items:
        for name in item["input"].get("attachments") or []:
            if not (ASSETS_DIR / name).is_file():
                problems.append(
                    f"{dataset.path.name}: {item['id']} names {name!r}, which is not "
                    f"in {ASSETS_DIR.name}/"
                )
    return problems


def _generation_problems(dataset: Dataset) -> list[str]:
    """A generation item is only runnable if the conversation parses and the tools
    it narrows to actually exist."""
    from .generation import conversation_from_item, tool_catalog

    problems = []
    for item in dataset.items:
        try:
            conversation_from_item(item["input"])
            tool_catalog(item["input"].get("tools"))
        except (ValueError, KeyError) as error:
            problems.append(f"{dataset.path.name}: {item.get('id')}: {error}")
    return problems


def _describe_external(client: Any) -> None:
    """Describe the evals whose items are not version controlled here."""
    for entry in registry.EVALS:
        if entry.file and entry.status == "live":
            continue
        client.create_dataset(name=entry.name, description=entry.langfuse_description())
        print(f"described: {entry.name} ({entry.status})")


def _archive_orphans(client: Any, lf: LangfuseApi, dataset: Dataset) -> None:
    """Retire remote items the file no longer has."""
    local = {item["id"] for item in dataset.items}
    remote = client.get_dataset(dataset.name).items
    for item in remote:
        if item.id in local or getattr(item, "status", "ACTIVE") == "ARCHIVED":
            continue
        lf.upsert_dataset_item(
            dataset_name=dataset.name, item_id=item.id, status="ARCHIVED"
        )
        print(f"  archived (no longer in the file): {item.id}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="validate the files without contacting Langfuse"
    )
    parser.add_argument("--dataset", help="sync only this dataset name")
    args = parser.parse_args()

    datasets = list(load_datasets())
    problems = [problem for dataset in datasets for problem in validate(dataset)]
    for problem in problems:
        print(f"  INVALID: {problem}")
    if problems:
        return 1
    for dataset in datasets:
        for absent in missing_assets(dataset):
            print(f"  LOCAL: {absent}")

    if args.check:
        for dataset in datasets:
            print(f"  {dataset.name}: {len(dataset.items)} items OK")
        return 0

    lf = LangfuseApi()
    client = get_client()
    if not args.dataset:
        _describe_external(client)
    for dataset in datasets:
        if args.dataset and dataset.name != args.dataset:
            continue
        print(f"{dataset.name} ({dataset.path.name})")
        # Create first: upsert 404s on a missing dataset.
        client.create_dataset(name=dataset.name, description=dataset.description)
        for item in dataset.items:
            lf.upsert_dataset_item(
                dataset_name=dataset.name,
                item_id=item["id"],
                input=render_input(dataset, item),
                expected_output=item["expectedOutput"],
                metadata={**item["metadata"], "prompt": dataset.prompt, "kind": dataset.kind},
            )
            print(f"  {item['id']}")
        _archive_orphans(client, lf, dataset)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
