; Unshipped analyzer release
; https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.Analyzers/ReleaseTrackingAnalyzers.Help.md

### New Rules

| Rule ID       | Category      | Severity | Notes                                             |
| ------------- | ------------- | -------- | ------------------------------------------------- |
| ALTINNAPP0001 | General       | Warning  | Project not found                                 |
| ALTINNAPP0002 | Metadata      | Warning  | Error in applicationmetadata.json                 |
| ALTINNAPP9999 | General       | Warning  | Unknown error                                     |
| ALTINNAPP0500 | CodeSmells    | Warning  | CodeSmells                                        |
| ALTINNAPP0600 | Deprecation   | Error    | enablePdfCreation is not supported                |
| ALTINNAPP0601 | Deprecation   | Error    | Legacy eFormidling config is not supported        |
| ALTINNAPP0700 | Contracts     | Error    | Sealed default implementation replaced            |
| ALTINNAPP0701 | Contracts     | Error    | Incomplete registration discarded                 |
| ALTINNAPP0702 | Contracts     | Error    | Mailbox handle answered twice                     |
| ALTINNAPP0703 | Contracts     | Error    | Mailbox opened but never answered                 |
| ALTINNAPP0800 | Authorization | Error    | Service owner is missing required authorization   |
| ALTINNAPP0801 | Authorization | Warning  | Service owner authorization could not be verified |
