---
name: studio-app-lib
description: "Custom C# in an Altinn app through the Altinn.App.Core interfaces: which one to implement for instantiation, data processing, validation, options, actions, gateways, signing, payment, process tasks and hooks, and how to register it."
metadata:
  studio-title: Egen kode i appen (C#)
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/extension-points/
---

An app runs its own C# through interfaces in the `Altinn.App.Core` package. You write a class that implements one,
register it in `App/Program.cs`, and the app libraries call it at a fixed point. Use this skill to choose the
interface, connect it to the files that name it, and get its exact signature.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## Choose the interface

The interfaces below are in `Altinn.App.Core`. `Altinn.App.Api` hosts the app and has none for apps to implement.
The names are the same in v8 and v9, in the namespace `Altinn.App.Core.Features` unless the row says otherwise.
Process hooks and service tasks differ between the versions, so the version file has them.

| Job | Interface | Connects through |
| --- | --- | --- |
| Set data when the app creates an instance | `IInstantiationProcessor` | Runs for every new instance |
| Decide whether the user may create an instance | `IInstantiationValidator` | Runs for every new instance |
| Change data when the user saves | `IDataWriteProcessor` | Gets the task ID and the changed data elements |
| Change data when the app reads it, before the user sees it | `IDataProcessor` (`ProcessDataRead`) | Runs for every form data read |
| Validate the form data of one data type | `IFormDataValidator` | `DataType`: a data type ID in `applicationmetadata.json` |
| Validate data elements of one type, such as attachments | `IDataElementValidator` | `DataType` |
| Validate a task before it ends | `ITaskValidator` | `TaskId`: a task ID in `process.bpmn` |
| Validate across data types | `IValidator` | `TaskId`, or `*` for every task |
| Read facts from an uploaded file, such as its real file type | File analyzer, named in the version file | `Id`: listed in the data type's `enabledFileAnalysers` |
| Accept or reject an uploaded file from those facts | `IFileValidator` (`.Validation`) | `Id`: listed in the data type's `enabledFileValidators` |
| Options computed in code | `IAppOptionsProvider` | `Id`: the component's `optionsId` |
| Options that depend on the instance | `IInstanceAppOptionsProvider` | `Id`, and `"secure": true` on the component |
| Rows for the List component | `IDataListProvider`, `IInstanceDataListProvider` | `Id`: the component's `dataListId` |
| Server action that a button runs | `IUserAction` | `Id`: the action on the task, in the policy and on the CustomButton |
| A rule for an action beyond the policy | `IUserActionAuthorizer` | The action and task given when you register it |
| Choose the flow out of an exclusive gateway | `IProcessExclusiveGateway` | `GatewayId`: the gateway's ID in `process.bpmn` |
| Decide at runtime who signs | `ISigneeProvider` (`.Signing`) | `Id`: `<altinn:signeeProviderId>` on the signing task |
| Compute what the user pays | `IOrderDetailsCalculator` (`.Payment`) | One per app, used by every payment task |
| Use another payment provider than Nets Easy | `IPaymentProcessor` (`.Payment.Processors`) | `PaymentProcessorId`: the ID the order details name |
| A task type of your own that users complete | `IProcessTask` (`Altinn.App.Core.Internal.Process.ProcessTasks`) | `Type`: `<altinn:taskType>` on a `bpmn:task` |
| Work the app does on its own in the process | `IServiceTask` | `Type`: `<altinn:taskType>` on a `bpmn:serviceTask` |
| Run code when a task starts, ends or is abandoned, or when the process ends | process hooks | See the version file |

Some of these connections have rules of their own:

- An `IProcessExclusiveGateway` runs only when none of the gateway's outgoing flows has a condition. With a condition
  on any flow, the app evaluates the conditions instead. The `studio-process` skill covers gateways.
- A server action needs the action on the task in `process.bpmn` (the `studio-process` skill) and a policy rule that
  gives it (the `studio-policy` skill). The button is a CustomButton with an action of type `ServerAction` (the
  `studio-layouts` skill).
- Users move the process on from an `IProcessTask` of your own only with a policy action named after its `Type`.
  Service tasks differ between the versions.
- `IInstanceValidator` is obsolete in both versions. Use the validators in the table.
- When a user uploads a file to a data type, the app runs the analyzers that the data type's `enabledFileAnalysers` in
  `applicationmetadata.json` names, then the validators in its `enabledFileValidators`, which get the analyzers'
  results. The `Altinn.FileAnalyzers` package has a ready-made check of the real file type, registered with
  `AddMimeTypeValidation()`. Use its 8.x release in a v8 app and its 9.x release in a v9 app.

## Text in messages from C#

`ValidationIssue` and `InstantiationValidationResult` take a text key in `CustomTextKey` and its parameters in
`CustomTextParameters`, a `Dictionary<string, string>`. The text resource declares one variable per parameter, with
the parameter's name as `key` and `customTextParameters` as `dataSource`. The text refers to the variables by index,
`{0}` for the first:

```csharp
CustomTextKey = "error.max-age",
CustomTextParameters = new() { ["maxAge"] = "67" },
```

```json
{
  "id": "error.max-age",
  "value": "Alderen kan ikke være over {0} år.",
  "variables": [{ "key": "maxAge", "dataSource": "customTextParameters" }]
}
```

`CustomTextParams`, a list, is obsolete, and the app frontend ignores it. The `studio-text-resources` skill covers
variables.

## Register the implementation

The templates for both versions have `RegisterCustomAppServices` at the top of `App/Program.cs`. Add one line per
interface the class implements:

```csharp
void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    services.AddTransient<IDataWriteProcessor, MyDataWriteProcessor>();
    services.AddTransient<IServiceTask, MyServiceTask>();
}
```

- The app does not find classes by itself. A class you do not register never runs, and the build does not warn.
- Register under the interface the table names. A service task is registered as `IServiceTask`, not `IProcessTask`.
- Register as transient, as the docs do. Inject what the class needs through its constructor, such as
  `IAppMetadata`, `IAppResources` or `IDataClient`.
- `IUserActionAuthorizer` is the exception. Register it with one of the `AddTransientUserActionAuthorizerFor...`
  methods, which take the action and task it applies to.
- Altinn.Codelists, eFormidling, Fiks Arkiv and Maskinporten have their own registration methods. Their skills
  cover them.
- Leave the code below the comment `Unless you are sure what you are doing` as it is. The one exception is
  `builder.AddAzureKeyVaultAsConfigProvider()` for secrets, which goes there. The `studio-app-configuration` skill
  says where.
- Add a `using` for the interface's namespace, unless `App/App.csproj` already has a `<Using>` for it.
- Put the classes under `App/logic/`, as the docs and test apps do.

## Get the exact signature

Members change between versions, and some changed within v8. Hand-written copies, in the docs or in earlier answers,
go stale. Read the signature from the package version that `App/App.csproj` references:

- The package ships XML docs next to the assembly. After a restore or build, NuGet keeps them in its packages
  folder, by default `~/.nuget/packages/altinn.app.core/<version>/lib/<framework>/Altinn.App.Core.xml`. Search it
  for `T:` and the interface name, then for `M:` and the interface name for its members.
- In an IDE, go to the interface's definition.
- The source at the release tag, linked in the version file.

Implement the members without a default body. Several interfaces have members with defaults, such as
`ValidationSource` or `NoIncrementalValidation`. Override those only when you need another value. The compiler
lists any member you missed.

## When another skill owns the topic

- Prefill in code, and checking prefill from query parameters: the `studio-prefill` skill.
- Calculations, hiding and validation that an expression can do without C#: the `studio-expressions` skill. Which
  validation mechanism to use, and where a C# validator's messages show: the `studio-validation` skill.
- Option lists and how a component uses them: the `studio-code-lists` skill.
- Signing and payment end to end: the `studio-signing` and `studio-payment` skills.
- eFormidling, Fiks Arkiv and external APIs (`IExternalApiClient`): the `studio-integrations` skill.

## Before you finish

- `RegisterCustomAppServices` registers each new class under every interface it implements.
- Every ID in the class matches the file that names it, character for character: `DataType`, `TaskId`, `Id`,
  `GatewayId` and `Type`.
- The policy gives every action and task type the code depends on.
- The app builds without new errors or warnings about obsolete members.
- Run the app and take an instance through the step that calls the code.

## Docs

- [Grensesnitt for egen kode (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/extension-points/):
  every interface a v9 app can implement, with a link to its page. Its row for `IPipelineServiceTask` is outdated.
  v9 has only `IServiceTask`.
- [Logikk (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/): the v8 pages on instantiation,
  data processing and validation in C#.
- [Endre skjemadata automatisk (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/dataprocessing/):
  when the app runs `IDataWriteProcessor` and `IDataProcessor`, and how a processor stops a save.
- [Server Action (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/process/actions/serveraction/) and
  [Serverhandlinger (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/process/actions/serveraction/):
  `IUserAction` with the task and policy it needs.
- [Instansiering (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/instantiation/): rules in
  `IInstantiationValidator` for who may create an instance.
