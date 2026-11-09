---
name: studio-process
description: Change the app process in App/config/process/process.bpmn. Covers tasks and task types, service tasks such as PDF and eFormidling, exclusive gateways and their conditions, actions, and the files to update when you add, rename or remove a task.
metadata:
  studio-title: Prosess og oppgaver
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/process/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/process/
---

Other files name tasks by their id, so a change to a task usually touches files outside the process too.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## What the app reads

- The root is `definitions` in `http://www.omg.org/spec/BPMN/20100524/MODEL`, usually with the prefix `bpmn:`. Altinn
  settings are in `http://altinn.no/process`, with the prefix `altinn:`. Keep the namespace declarations the file has.
- Keep one `<bpmn:process>`. The app reads only these direct children of it:
  - `startEvent`, `task`, `serviceTask`, `exclusiveGateway`, `endEvent` and `sequenceFlow`
  - on them: `id`, `sourceRef`, `targetRef`, `<bpmn:conditionExpression>`, the gateway's `default` and
    `<bpmn:outgoing>`, and `<bpmn:extensionElements>`
- The app ignores everything else without a message:
  - other BPMN elements, such as `parallelGateway`, `userTask`, `subProcess` and intermediate or boundary events. A
    flow into one of them fails when an instance reaches it.
  - `altinn:` elements it does not know, misspelled ones, and ones in another namespace, such as `http://altinn.no`
  - every occurrence after the first of an element that holds one value
- The app ignores `<bpmndi:BPMNDiagram>`, but Studio's process editor draws from it. Give each new node a
  `BPMNShape` and each new flow a `BPMNEdge`, and remove them with the element.

## Flow rules

- Exactly one start event and at least one end event.
- Every id is unique across nodes and flows.
- Every task has exactly one outgoing flow. The app follows every flow whose `sourceRef` is the task, and fails with
  "Multiple next elements found" on two.
- Branch only with an `exclusiveGateway`.
- A gateway follows only the flows its `<bpmn:outgoing>` lists. List every flow that starts at it. Studio draws an
  unlisted flow, but the app never takes it.
- On tasks and events the app ignores `<bpmn:incoming>` and `<bpmn:outgoing>`, but Studio reads them. Keep them in
  step with `sourceRef` and `targetRef`.
- Put a task between gateways that lead back to each other. A loop of gateways alone makes the app recurse until it
  fails.

## Gateway conditions

The text of `<bpmn:conditionExpression>` is an Altinn expression, the same language as dynamic expressions in layouts
(the `studio-expressions` skill). The app takes a flow when its expression is `true`. Never leave a condition empty.

- `["gatewayAction"]` is the action that moved the process: the `action` sent to `process/next`, such as `confirm`,
  `reject` or an ActionButton's action. A service task can set it too. A plain submit sends no action, so the value
  is `null`. Test for the action you route on and use `notEquals` for the other branch:

  ```xml
  <bpmn:sequenceFlow id="Flow_back" sourceRef="Gateway_1" targetRef="Task_1">
    <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">["equals", ["gatewayAction"], "reject"]</bpmn:conditionExpression>
  </bpmn:sequenceFlow>
  <bpmn:sequenceFlow id="Flow_on" sourceRef="Gateway_1" targetRef="Task_2">
    <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">["notEquals", ["gatewayAction"], "reject"]</bpmn:conditionExpression>
  </bpmn:sequenceFlow>
  ```

- `["dataModel", "Path.To.Field"]` reads the data type in the gateway's `connectedDataTypeId`. Without it, the app
  uses the data type of the UI of the task being left. A service task usually has no such data type, so a gateway
  right after a PDF or eFormidling task fails to read the data model unless you connect a data type:

  ```xml
  <bpmn:exclusiveGateway id="Gateway_1">
    <bpmn:incoming>Flow_pdf_g1</bpmn:incoming>
    <bpmn:outgoing>Flow_back</bpmn:outgoing>
    <bpmn:outgoing>Flow_on</bpmn:outgoing>
    <bpmn:extensionElements>
      <altinn:gatewayExtension>
        <altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>
      </altinn:gatewayExtension>
    </bpmn:extensionElements>
  </bpmn:exclusiveGateway>
  ```

  `["dataModel", "Path.To.Field", "model"]` names the data type in the expression instead, for a data type with
  `maxCount: 1`.
- Write gateways in the form both versions run the same way:
  - Give every outgoing flow a condition.
  - Make exactly one condition true in every case. The app fails when none or more than one is true.
  - Leave out the `default` attribute. v8 and v9 treat it differently, as the version files explain.
  - A gateway with a single outgoing flow needs no condition.
- An `IProcessExclusiveGateway` whose `GatewayId` is the gateway's id decides only when no outgoing flow of the
  gateway has a condition. It must leave exactly one flow. The `studio-app-lib` skill covers the code.

## Task types

Every task needs `<bpmn:extensionElements><altinn:taskExtension><altinn:taskType>`. Write the type exactly, in the
same case. Write service tasks as `<bpmn:serviceTask>` and every other task as `<bpmn:task>`. The exact XML for each
type is in [references/task-types.md](references/task-types.md), and for signing and payment tasks in the
`studio-signing` and `studio-payment` skills.

| `taskType` | Kind | Element | Action a `process/next` without an action needs |
| --- | --- | --- | --- |
| `data` | user task | `bpmn:task` | `write` |
| `confirmation` | user task | `bpmn:task` | `confirm` |
| `feedback` | user task, left by an external system | `bpmn:task` | `write` |
| `signing` | user task | `bpmn:task` | `sign` or `write` |
| `payment` | user task | `bpmn:task` | `pay` or `write` |
| `pdf`, `subformPdf`, `eFormidling` | service task | `bpmn:serviceTask` | `write` |
| `fiksArkiv` | service task, needs `services.AddFiksArkiv()` | `bpmn:serviceTask` | `write` |
| the `Type` of your own `IProcessTask` | user task | `bpmn:task` | an action named after the type |
| the `Type` of your own `IServiceTask` | service task | `bpmn:serviceTask` | see the version file |

The app checks the action on the task the instance is in, so a policy rule scoped to one task does not cover the
next. On a service task, a user needs the action to run the task in v8 and to retry it in v9. Who needs which action
is for the `studio-policy` skill.

## Actions

List the actions users take on a task in its `taskExtension`:

```xml
<altinn:actions>
  <altinn:action>confirm</altinn:action>
  <altinn:action>reject</altinn:action>
  <altinn:action type="serverAction">lookupCompany</altinn:action>
</altinn:actions>
```

- An action moves the process (`processAction`, the default), or runs an `IUserAction` without moving it
  (`type="serverAction"`). Write `type` without a prefix. Any other value of `type` stops the app from loading the
  process.
- Most of the frontend's buttons are enabled only when the current task lists the action and the policy permits it:
  ActionButton, CustomButton, the submit button and page of a confirmation task, the signing components and the
  service task page. `read` and `write` are always checked and need no listing. The `Payment` component checks
  neither. List:
  - `confirm` on a confirmation task, or the submit button stays disabled
  - `sign` on a signing task
  - `pay`, `confirm` and `reject` on a payment task, as the `studio-payment` skill describes
  - `reject` where users can go back or decline
  - the `action` of every ActionButton and CustomButton on the task's pages
- `process/next` checks only the policy, not the list. A missing listing disables a button that checks it. A missing
  grant gives 403.
- `reject` abandons the task. The app skips validation for `reject` only when the task lists `reject`. Route the
  reject with a gateway after the task, as in the example above.

## Files that change with a task

When you add, rename or remove a task, update everything that names its id:

- `dataTypes[].taskId` in `App/config/applicationmetadata.json`: the data types the task creates
  (`appLogic.autoCreate`), edits and validates. The id must match exactly. The `studio-app-settings` skill
  covers the file.
- The task's pages, for data, signing and payment tasks. The version files say where they live.
- Policy rules scoped to the task with `urn:altinn:task`. See the `studio-policy` skill.
- `target.taskId` in Summary2 components. See the `studio-layouts` skill.
- `<altinn:autoPdfTaskIds>` in PDF tasks.
- The data types that signing and payment tasks name. Each must exist in `applicationmetadata.json`. The
  `studio-signing` and `studio-payment` skills own that setup.
- The data types in an eFormidling task's `dataTypes`, and `ref-data-as-pdf` with `application/pdf` for PDF tasks.

When you remove a task, also remove the flows into and out of it, its entries in gateways' `<bpmn:outgoing>`, and its
diagram shapes and edges.

## Studio's process editor

- When it saves, Studio checks only that the file is well-formed XML of at most 1 MB. It does not check flows,
  gateways, conditions or task settings.
- When it loads a file, Studio drops every later element that repeats an id. The next save from Studio deletes them.
- The editor accepts ids of ASCII letters, digits, `_` and `-`, at most 50 characters, unique ignoring case, and not
  starting with `custom` in any case. Use such ids so the file stays editable in Studio.
- When you add, rename or remove a task in the editor, Studio updates the UI, data types, `taskId` references and
  policy rules it knows about. When you edit the file by hand, nothing does. Update them yourself.
- The editor warns when a Fiks Arkiv task is not followed by a gateway with branches.
- Its custom service task leaves `<altinn:taskType>` empty. Fill it in.

## Before you finish

- Every `sourceRef` and `targetRef` names an element in the process, each task has one outgoing flow, and every
  gateway lists all its outgoing flows.
- Every gateway with more than one flow has conditions that are true one at a time in every case, including a `null`
  `gatewayAction`.
- Every action a button or component on the task uses is listed on the task and granted in the policy. The
  `studio-policy` skill covers the grants.
- Every file that names a changed task id uses the new id.
- New elements have diagram shapes.
- In a v9 app, the process breaks none of the rules in [references/build-rules.md](references/build-rules.md).
