# MCP tool coverage

This list describes how well the MCP server tools covers the functionality of Altinn Studio.

Priority levels are 1, 2 and 3 (from high to low), and describe how important it is for each feature to be supported.

## Layout

| Feature             | Priority | Notes                                                                                                        |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| Navigation groups   | 1        | Not supported                                                                                                |
| Components          | 1        | Covered by `layout_components_tool` and `layout_properties_tool`                                             |
| Expressions         | 1        | Covered by `dynamic_expression_tool`                                                                         |
| Static code lists   | 1        | Partially covered by `layout_properties_tool` (does not fully support code lists referenced via `optionsId`) |
| Dynamic code lists  | 2        | Not supported                                                                                                |
| Subform             | 2        | Not supported                                                                                                |
| Footer              | 3        | Not supported                                                                                                |
| Layout as PDF       | 3        | Not supported                                                                                                |
| Auto-save behaviour | 3        | Not supported                                                                                                |

## Texts

| Feature        | Priority | Notes                                                    |
| -------------- | -------- | -------------------------------------------------------- |
| Text resources | 1        | Covered by `resource_tool` and `resource_validator_tool` |
| Translations   | 1        | Covered by `resource_tool`                               |
| Variables      | 2        | Covered by `resource_tool`                               |

## Data model

| Feature                                | Priority | Notes                                                 |
| -------------------------------------- | -------- | ----------------------------------------------------- |
| Data models in JSON Schema, XSD and C# | 1        | Covered by `datamodel_tool` and `datamodel_sync_tool` |
| Prefill                                | 2        | Covered by `prefill_tool`                             |

## Process

| Feature                                                                              | Priority | Notes         |
| ------------------------------------------------------------------------------------ | -------- | ------------- |
| Process flow, including task config (Data, Feedback, Signing, Confirmation, Payment) | 1        | Not supported |
| Custom receipt                                                                       | 2        | Not supported |
| Expressions in process                                                               | 2        | Not supported |
| Stateless apps                                                                       | 2        | Not supported |

## Policy

| Feature         | Priority | Notes                                                                              |
| --------------- | -------- | ---------------------------------------------------------------------------------- |
| Access roles    | 1        | Covered by `policy_tool`, `policy_validation_tool` and `policy_summarization_tool` |
| Access packages | 1        | Not supported                                                                      |

## Application metadata

| Feature                        | Priority | Notes         |
| ------------------------------ | -------- | ------------- |
| Party types config             | 3        | Not supported |
| Message box config             | 3        | Not supported |
| Data fields/data values config | 3        | Not supported |
| Virus scan config              | 3        | Not supported |
| Stateless config               | 3        | Not supported |
| Startup behaviour              | 3        | Not supported |

## Backend specific

| Feature                                                                | Priority | Notes |
| ---------------------------------------------------------------------- | -------- | ----- |
| Custom process hooks (IProcessTaskStart, IProcessTaskEnd, IProcessEnd) | 3        |       |
| Data processing (IDataProcessor)                                       | 3        |       |
| Instansiation (IInstantiationValidator, IInstantiationProcessor)       | 3        |       |
| Events                                                                 | 3        |       |
| Email and SMS alerts                                                   | 3        |       |
| Shadow fields                                                          | 3        |       |
| eFormidling                                                            | 3        |       |
| Consuming external APIs                                                | 3        |       |
