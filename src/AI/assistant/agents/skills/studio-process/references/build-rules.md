# Build rules for the process in a v9 app

A v9 app checks these rules when it builds, and an error stops the build. The rules that have a docs page link to
it.

| Rule | Severity | What it reports |
| --- | --- | --- |
| [ALTINNAPP0800](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp0800/) | error | The policy does not grant the service owner what the app does as the service owner |
| [ALTINNAPP0801](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp0801/) | warning | The service owner's grant cannot be verified, for example because it is scoped to a task |
| [ALTINNAPP1000](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp1000/) | error | A PDF task has neither `autoPdfTaskIds` nor `pdfLayoutName` |
| [ALTINNAPP1002](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp1002/) | warning | An `autoPdfTaskIds` entry adds nothing to the PDF |
| [ALTINNAPP1003](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp1003/) | error | A task uses the wrong element for its type |
| ALTINNAPP1004 | error | A flow leads to an element the app cannot move to, or to nothing |
| ALTINNAPP1005 | error | A gateway's `<bpmn:outgoing>` does not match the flows that start at it |
| ALTINNAPP1006 | warning | A gateway's `default` is not one of its listed flows |
| ALTINNAPP1007, ALTINNAPP1008 | error | An element has more than one outgoing flow, or none |
| ALTINNAPP1009 | error | Two elements share an id |
| ALTINNAPP1010 | error | A gateway mixes flows with and without a condition, other than the default |
| ALTINNAPP1011 | warning | Gateways form a loop with no task in it |
| ALTINNAPP1012 | error | A condition is empty |
| ALTINNAPP1013 | error | The process names a data type that `applicationmetadata.json` does not declare |
| ALTINNAPP1014 | error | A PDF task has no `ref-data-as-pdf` data type |
| ALTINNAPP1015 | error | A data type cannot hold what the task stores in it |
| ALTINNAPP1016 | warning | A signing or payment data type is not app-owned |
| ALTINNAPP1017 | warning | A data type's `taskId` names no task |
| ALTINNAPP1018 | warning | The process names a data type that the app skips |
| ALTINNAPP1019 | warning | A gateway's `connectedDataTypeId` is not declared |
| ALTINNAPP1020 | error | A task setting is missing or invalid in an environment |
| ALTINNAPP1021 | warning | A task setting the app ignores: misspelled, in the wrong namespace or repeated |
| ALTINNAPP1022 | warning | An `env` attribute the app cannot use |
| ALTINNAPP1023 | error | A gateway's default flow has a condition |
| [ALTINNAPP1024](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp1024/) | error | `subformUiFolder` names a folder the app cannot render |
| [ALTINNAPP1026](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/rules/altinnapp1026/) | error | `pdfLayoutName` names a page that does not exist |

Most flow rules check only what an instance can reach from the start event, so a task you have placed but not
connected yet passes them. ALTINNAPP1009, ALTINNAPP1010 and ALTINNAPP1023 check every element.
