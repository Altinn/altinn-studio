"""LangGraph nodes delegating to modular node handlers."""

from agents.graph.state import AgentState
from agents.graph.nodes.intake_node import handle as intake_handle, scan_repository as intake_scan
from agents.graph.nodes.planner_node import handle as planner_handle
from agents.graph.nodes.actor_node import handle as actor_handle
from agents.graph.nodes.verifier_node import handle as verifier_handle
from agents.graph.nodes.reviewer_node import handle as reviewer_handle


async def intake(state: AgentState) -> AgentState:
    return await intake_handle(state)


def scan_repository(state: AgentState) -> AgentState:
    return intake_scan(state)


async def planner(state: AgentState) -> AgentState:
    return await planner_handle(state)


def actor(state: AgentState) -> AgentState:
    return actor_handle(state)


def verifier(state: AgentState) -> AgentState:
    return verifier_handle(state)


async def reviewer(state: AgentState) -> AgentState:
    return await reviewer_handle(state)