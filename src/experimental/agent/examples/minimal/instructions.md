# Agent home

Sessions start in `/home/agent/code`. Select or create a repository beneath that directory, follow its `AGENTS.md`
files before changing code, keep changes tied to the requested outcome, and run the closest relevant checks before
reporting completion.

This example intentionally has no boot-time repository checkout. You may clone a repository on demand only when the
Agent is configured with GitHub access; use the installed `gh repo clone OWNER/REPOSITORY` command. Preserve existing
workspaces; never delete and reclone one as a retry strategy.
