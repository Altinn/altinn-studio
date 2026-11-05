# Security controls

Code: `src/AI/assistant/agents/prompts/intent_security.md`, `src/AI/assistant/agents/core/tools/`, `src/AI/assistant/shared/utils/spotlight.py`, `src/AI/assistant/agents/services/llm/llm_client.py`, `src/AI/assistant/agents/core/context.py`, `src/AI/assistant/infra/kustomize/networkpolicy.yaml`, `src/AI/assistant/agents/core/runner_operator.py`, `src/AI/assistant/agents/core/tools/upgrade_app_tool.py`

The security model has four layers. Each layer covers a risk that the other layers do not cover.

**Network access.** A NetworkPolicy blocks connections from pods other than the Designer pods.

**Intent gate.** This layer runs in workflow mode only. It examines the goal text for abuse before the graph starts. It sees the names of the attachments, but not their content. The reason: a large PDF is expensive to examine, and it gives little signal.

**Structural containment.** This layer runs in both modes. It is the boundary that actually stops an attack:

- In chat mode, the loop refuses the write tools until the user gives permission.
- The file tools stay in the app repository.
- App code does not run in the assistant pod. The v9 upgrade runs MSBuild, which runs code from the app. The core operator runs it in a sandbox Job, in a microVM without secrets.
- The assistant holds no Kubernetes permission. Its token for the core operator is valid only for the operator, and the operator lets the assistant run only the upgrade.
- App code makes the patch that the upgrade returns. The job host refuses the whole patch when it has a symbolic link, a submodule, a CI workflow file or a git attribute file, and the tool applies it with `git apply`, which refuses paths outside the repository.
- `web_fetch` can only get pages from an allowlist of Altinn hosts. This also applies to each redirect.
- Each change goes to a session branch. A person examines the branch before the merge.
- The prompts that Langfuse serves are published by CI after the merge to main, so each served prompt has a reviewed commit.

**Spotlighting.** This layer marks untrusted text, so that the model reads it as data and not as instructions. This layer runs in both modes. It covers the content of uploaded documents, which the intent gate does not see. Document content gets to the model two times: as the attachment that the spec extractor reads, and as the extracted `FormSpec` in the system prompt of the loop. The code puts the two in `<attachment_content>` and `<form_spec>` tags, with a notice that the content is data, not instructions. The code escapes a closing tag in the content, so a document cannot close its block too early.

```mermaid
flowchart LR
  U["Uploaded PDF"] --> X["Spec extraction"]
  X --> F["form_spec block with a data notice"]
  F --> M["Loop model"]
  M -->|SECURITY_NOTICE line| A["Warning flag in Designer"]
```

_The path of a document. The model reports an injection attempt on one line. The code removes the line and sends only a flag._

`src/AI/assistant/shared/utils/spotlight.py` makes the tags. `llm_client.py` applies them to the attachment, and `src/AI/assistant/agents/core/context.py` applies them to the form spec. The control is in code, not in a prompt file. The reason: Langfuse serves the prompts, so a control that is only in a prompt file can disappear after an edit in Langfuse.
