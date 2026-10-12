# Security controls

Code: `agents/prompts/intent_security.md`, `agents/core/tools/`, `shared/utils/spotlight.py`, `agents/services/llm/llm_client.py`, `agents/core/context.py`

The security model has three layers. Each layer covers a risk that the other layers do not cover.

**Intent gate.** This layer runs in workflow mode only. It examines the goal text for abuse before the graph starts. It sees the names of the attachments, but not their content. The reason: a large PDF is expensive to examine, and it gives little signal.

**Structural containment.** This layer runs in all modes. It is the boundary that actually stops an attack:

- In read-only mode, the loop refuses the write tools until the user gives permission.
- The file tools stay in the app repository.
- `web_fetch` can only get pages from an allowlist of Altinn hosts.
- Each change goes to a session branch. A person examines the branch before the merge.
- The prompts that Langfuse serves are published by CI after the merge to main, so each served prompt has a reviewed commit.

**Spotlighting.** This layer runs in all modes. It covers the content of uploaded documents, which the intent gate does not see. Document content gets to the model two times: as the attachment that the spec extractor reads, and as the extracted `FormSpec` in the system prompt of the loop. The code puts the two in `<attachment_content>` and `<form_spec>` tags, with a notice that the content is data, not instructions. The code escapes a closing tag in the content, so a document cannot close its block too early.

```mermaid
flowchart LR
  U["Uploaded PDF"] --> X["Spec extraction"]
  X --> F["form_spec block with a data notice"]
  F --> M["Loop model"]
  M -->|SECURITY_NOTICE line| A["Warning flag in Designer"]
```

_The path of a document. The model reports an injection attempt on one line. The code removes the line and sends only a flag._

`shared/utils/spotlight.py` makes the tags. `llm_client.py` applies them to the attachment, and `core/context.py` applies them to the form spec. The control is in code, not in a prompt file. The reason: Langfuse serves the prompts, so a control that is only in a prompt file can disappear after an edit in Langfuse.
