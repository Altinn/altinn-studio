"""BPMN graph analysis for Altinn 3 apps.

The `bpmn_tasks` table gives us the raw task list from process.bpmn — a 1:1
view of the definition. This module adds a *user-journey* view: by following
sequence flows from start to end and resolving gateways, we compute the
distinct paths a sluttbruker can actually walk through the process.

For most apps with linear processes (start → task → end), the journey is
identical to the task list. Apps with `exclusiveGateway` branches expand
into multiple distinct journeys, and a parallelGateway can shorten or
lengthen the perceived flow depending on intent.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

# Cap path enumeration so pathological BPMNs don't explode (cycles, huge fans)
MAX_PATHS = 200
MAX_PATH_LENGTH = 100


TASK_TAGS = {"task", "userTask", "serviceTask", "scriptTask", "manualTask",
             "sendTask", "receiveTask", "callActivity", "businessRuleTask"}
GATEWAY_TAGS = {"exclusiveGateway", "inclusiveGateway", "parallelGateway",
                "complexGateway", "eventBasedGateway"}


def _localname(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def parse_bpmn_graph(bpmn_path: Path) -> Optional[dict]:
    """Return a graph representation of the BPMN, or None if it can't be parsed.

    {
      "nodes": {
        "<id>": {"kind": "task"|"gateway"|"startEvent"|"endEvent",
                  "tag": "task", "altinn_type": "data"|"signing"|...,
                  "name": "..."}
      },
      "edges": [{"id": "...", "source": "...", "target": "...", "name": "..."}, ...]
    }
    """
    if not bpmn_path.exists():
        return None
    try:
        tree = ET.parse(bpmn_path)
    except ET.ParseError:
        return None

    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    for elem in tree.iter():
        tag = _localname(elem.tag)
        nid = elem.attrib.get("id", "")
        if not nid:
            continue

        if tag in TASK_TAGS:
            altinn_type = _altinn_task_type(elem)
            nodes[nid] = {
                "kind": "task",
                "tag": tag,
                "altinn_type": altinn_type,
                "name": elem.attrib.get("name", "") or "",
            }
        elif tag in GATEWAY_TAGS:
            nodes[nid] = {
                "kind": "gateway",
                "tag": tag,
                "altinn_type": "",
                "name": elem.attrib.get("name", "") or "",
            }
        elif tag == "startEvent":
            nodes[nid] = {"kind": "startEvent", "tag": tag,
                          "altinn_type": "", "name": elem.attrib.get("name", "")}
        elif tag == "endEvent":
            nodes[nid] = {"kind": "endEvent", "tag": tag,
                          "altinn_type": "", "name": elem.attrib.get("name", "")}
        elif tag == "sequenceFlow":
            src = elem.attrib.get("sourceRef", "")
            tgt = elem.attrib.get("targetRef", "")
            if src and tgt:
                edges.append({
                    "id": nid,
                    "source": src,
                    "target": tgt,
                    "name": elem.attrib.get("name", "") or "",
                })

    return {"nodes": nodes, "edges": edges}


def _altinn_task_type(elem) -> str:
    # Look for altinn:taskType inside extensionElements
    for child in elem.iter():
        tag = _localname(child.tag)
        if tag == "taskType" and child.text:
            return child.text.strip()
    return ""


def enumerate_user_journeys(graph: dict) -> list[list[dict]]:
    """Enumerate all distinct paths from any startEvent to any endEvent.

    A journey is a list of *visible* steps (tasks). Gateways and intermediate
    events are traversed but not included in the journey list.

    Capped at MAX_PATHS to prevent explosion on complex graphs.
    """
    if not graph:
        return []
    nodes = graph["nodes"]
    adj: dict[str, list[str]] = {}
    for edge in graph["edges"]:
        adj.setdefault(edge["source"], []).append(edge["target"])

    start_ids = [nid for nid, n in nodes.items() if n["kind"] == "startEvent"]
    journeys: list[list[dict]] = []

    def dfs(current: str, path: list[dict], visited: set[str]) -> None:
        if len(journeys) >= MAX_PATHS:
            return
        if len(path) > MAX_PATH_LENGTH:
            return
        if current in visited:  # cycle guard
            return
        visited = visited | {current}
        node = nodes.get(current)
        if not node:
            return
        if node["kind"] == "task":
            path = path + [{
                "id": current,
                "name": node["name"],
                "altinn_type": node["altinn_type"],
            }]
        if node["kind"] == "endEvent":
            journeys.append(path)
            return
        for nxt in adj.get(current, []):
            dfs(nxt, path, visited)

    for start in start_ids:
        for nxt in adj.get(start, []):
            dfs(nxt, [], {start})

    return journeys


def summarize(bpmn_path: Path) -> dict:
    """Compute both the 1:1 BPMN view and the user-journey view for an app."""
    graph = parse_bpmn_graph(bpmn_path)
    if not graph:
        return {
            "task_count": 0,
            "gateway_count": 0,
            "task_sequence_raw": "",
            "journey_count": 0,
            "min_journey_length": 0,
            "max_journey_length": 0,
            "complexity": "none",
            "primary_journey": "",
        }

    nodes = graph["nodes"]
    tasks = [n for n in nodes.values() if n["kind"] == "task"]
    gateways = [n for n in nodes.values() if n["kind"] == "gateway"]

    task_count = len(tasks)
    gateway_count = len(gateways)

    # Raw 1:1 sequence — tasks in document order (already what bpmn_tasks captures)
    task_sequence_raw = " → ".join(
        t["altinn_type"] or t["tag"] for t in tasks
    )

    journeys = enumerate_user_journeys(graph)
    if journeys:
        lengths = [len(j) for j in journeys]
        min_len = min(lengths)
        max_len = max(lengths)
        # Primary journey = longest one (most-steps user experience)
        primary = max(journeys, key=len)
        primary_str = " → ".join(s["altinn_type"] or "task" for s in primary)
    else:
        min_len = max_len = 0
        primary_str = ""

    # Complexity classification — useful for filtering
    if gateway_count == 0:
        complexity = "linear"
    elif len(journeys) >= MAX_PATHS:
        complexity = "complex"
    elif len(journeys) > 1:
        complexity = "branching"
    else:
        complexity = "linear"  # gateway with single path (defensive)

    return {
        "task_count": task_count,
        "gateway_count": gateway_count,
        "task_sequence_raw": task_sequence_raw,
        "journey_count": len(journeys),
        "min_journey_length": min_len,
        "max_journey_length": max_len,
        "complexity": complexity,
        "primary_journey": primary_str,
    }
