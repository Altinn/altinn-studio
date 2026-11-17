"""The modes a run has. A chat run only reads the app. A workflow run may change it."""

CHAT = "chat"
WORKFLOW = "workflow"


def run_mode(allow_app_changes: bool) -> str:
    return WORKFLOW if allow_app_changes else CHAT
