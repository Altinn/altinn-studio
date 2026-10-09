; Unshipped analyzer release
; https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.Analyzers/ReleaseTrackingAnalyzers.Help.md

### New Rules

Rule ID | Category | Severity | Notes
--------|----------|----------|-------
ALTINNAPP0001 | General | Warning | Project not found
ALTINNAPP0002 | Metadata | Warning | Error in applicationmetadata.json
ALTINNAPP9999 | General | Warning | Unknown error
ALTINNAPP0500 | CodeSmells | Warning | CodeSmells
ALTINNAPP0600 | Deprecation | Error | enablePdfCreation is not supported
ALTINNAPP0601 | Deprecation | Error | Legacy eFormidling config is not supported
ALTINNAPP0700 | Contracts | Error | Sealed default implementation replaced
ALTINNAPP0701 | Contracts | Error | Incomplete registration discarded
ALTINNAPP0702 | Contracts | Error | Mailbox handle answered twice
ALTINNAPP0703 | Contracts | Error | Mailbox opened but never answered
ALTINNAPP0800 | Authorization | Error | Service owner is missing required authorization
ALTINNAPP0801 | Authorization | Warning | Service owner authorization could not be verified
ALTINNAPP0900 | Metadata | Error | Duplicate presentationFields/dataFields id
ALTINNAPP0901 | Metadata | Warning | presentationFields/dataFields entry references an unknown data type
ALTINNAPP1000 | Process | Error | PDF service task has nothing to render
ALTINNAPP1001 | Process | Error | PDF service task has a UI folder without pdfLayoutName
ALTINNAPP1002 | Process | Warning | PDF service task includes a task without a UI folder
ALTINNAPP1003 | Process | Error | Task uses the wrong BPMN element
ALTINNAPP1004 | Process | Error | Sequence flow leads to an element the app cannot move to
ALTINNAPP1005 | Process | Error | Exclusive gateway's outgoing list does not match its sequence flows
ALTINNAPP1006 | Process | Warning | Exclusive gateway's default is not one of the flows it lists
ALTINNAPP1007 | Process | Error | Element has more than one outgoing sequence flow
ALTINNAPP1008 | Process | Error | Element has no outgoing sequence flow
ALTINNAPP1009 | Process | Error | Duplicate element id in the process
ALTINNAPP1010 | Process | Error | Exclusive gateway mixes flows with and without a condition
ALTINNAPP1011 | Process | Warning | Exclusive gateways form a loop
ALTINNAPP1012 | Process | Error | Exclusive gateway lists a flow with an empty condition
