using System.Xml.Linq;
using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks the data types that <c>config/process/process.bpmn</c> uses against the <c>dataTypes</c> in
/// <c>config/applicationmetadata.json</c>. The runtime finds a data type by its exact id (only the sign action ignores
/// case) and checks few of these references at startup, most of them in Development only, so a mistake otherwise
/// surfaces only when an instance reaches the task - often after the user has signed or paid. The process is read as
/// the runtime deserializes it with XmlSerializer (see <c>AltinnTaskExtension</c> in Altinn.App.Core): only the
/// elements it binds, by exact name and namespace. An element bound to a single value, such as
/// <c>altinn:taskExtension</c>, <c>altinn:signatureConfig</c> or <c>altinn:signatureDataType</c>, is read from its
/// first occurrence only, and later ones are ignored; an element bound to a list is read from every occurrence.
/// </summary>
internal static class ProcessDataTypeUtils
{
    // PdfService.PdfElementType: every PDF that the pdf and subformPdf tasks generate is stored under it.
    private const string PdfDataType = "ref-data-as-pdf";
    private const string PdfContentType = "application/pdf";
    private const string JsonContentType = "application/json";
    private const string AppOwned = "app:owned";
    private const string SigningTaskType = "signing";
    private const string SubformPdfTaskType = "subformPdf";

    private static readonly XName _gatewayExtension = ProcessFile.Altinn + "gatewayExtension";
    private static readonly XName _connectedDataTypeId = ProcessFile.Altinn + "connectedDataTypeId";
    private static readonly XName _xsiNil = XNamespace.Get("http://www.w3.org/2001/XMLSchema-instance") + "nil";

    /// <summary>
    /// The elements on a path under <c>altinn:taskExtension</c> that the runtime binds to a list: the repeated
    /// <c>altinn:dataTypes</c> of eFormidling, the items of every list, and the <c>XmlArray</c> wrappers, which
    /// XmlSerializer joins when they repeat. Every other element on a path is bound to a single value.
    /// </summary>
    private static readonly HashSet<string> _listElements =
    [
        "dataTypesToSign",
        "uniqueFromSignaturesInDataTypes",
        "dataTypes",
        "dataType",
    ];

    private static readonly string[] _subformDataTypeId = ["subformPdfConfig", "subformDataTypeId"];

    /// <summary>
    /// The elements under <c>altinn:taskExtension</c> that name a single data type each. The runtime deserializes
    /// them on every task, and the app's own task types may read them too, so they are checked whatever the task's
    /// type. <c>dataTypesToSign</c> is checked as a whole instead (<see cref="CheckDataTypesToSign"/>).
    /// </summary>
    private static readonly TaskReference[] _taskReferences =
    [
        // The signing configuration is checked only for null (SigningProcessTask), so an empty element is an id
        // the app looks up and fails on, like an unknown one. In a signing task, ALTINNAPP1020 reports it as missing.
        new(["signatureConfig", "signatureDataType"], SkipBlank: false, BlankIsMissingIn: SigningTaskType),
        new(["signatureConfig", "signeeStatesDataTypeId"], SkipBlank: false, BlankIsMissingIn: SigningTaskType),
        new(["signatureConfig", "signingPdfDataType"], SkipBlank: false),
        // UniqueSignatureAuthorizer only looks for signatures among the instance's data elements of these types, so
        // an entry that matches none, a blank one included, is skipped.
        new(
            ["signatureConfig", "uniqueFromSignaturesInDataTypes", "dataType"],
            SkipBlank: false,
            Skipped: "the app skips it when it checks that a signee has not signed already"
        ),
        // AltinnPaymentConfiguration.Validate rejects blank ids itself.
        new(["paymentConfig", "paymentDataType"], SkipBlank: true),
        new(["paymentConfig", "paymentReceiptPdfDataType"], SkipBlank: true),
        // SubformPdfServiceTask generates a PDF per data element of the type. On a subformPdf task its startup check
        // (ValidateConfiguration) rejects a blank id and one that names no data type, so the app does not start.
        // Another task type finds no data elements of an unknown type.
        new(
            _subformDataTypeId,
            SkipBlank: true,
            Skipped: "the task generates no PDFs for it and still succeeds",
            FailsInTaskType: SubformPdfTaskType
        ),
        // Every list counts, whatever its env: one that names no known environment applies when the app runs in
        // an environment the runtime does not recognize either. The startup check in EFormidlingServiceTask
        // fails on an empty id like any other unknown one.
        new(["eFormidlingConfig", "dataTypes", "dataType"], SkipBlank: false),
    ];

    private static readonly string[] _dataTypesToSign = ["signatureConfig", "dataTypesToSign", "dataType"];

    /// <summary>
    /// Appends a diagnostic for every data type the process names that applicationmetadata.json does not declare,
    /// or that cannot hold what a task stores in it, and for every data type whose <c>taskId</c> names no task.
    /// </summary>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = ProcessFile.FindSingle(additionalFiles);
        var metadataFile = MetadataFile.FindSingle(additionalFiles);
        if (
            processFile is null
            || metadataFile is null
            || ProcessFile.TryParse(processFile, token) is not { } parsed
            || MetadataFile.TryRead(metadataFile, token) is not { } metadata
        )
        {
            return;
        }

        if (ProcessFile.SingleProcess(parsed.Document) is not { } process)
        {
            return;
        }

        var context = new Context(processFile, parsed.Content, metadata.DataTypes, diagnostics);
        var taskIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var element in process.Elements())
        {
            if (element.Attribute("id")?.Value is not { Length: > 0 } id)
            {
                continue;
            }

            if (element.Name == ProcessFile.Task || element.Name == ProcessFile.ServiceTask)
            {
                taskIds.Add(id);
                if (
                    element.Element(ProcessFile.ExtensionElements)?.Element(ProcessFile.TaskExtension) is
                    { } taskExtension
                )
                {
                    CheckTask(context, element, id, taskExtension);
                }
            }
            else if (element.Name == ProcessFile.ExclusiveGateway)
            {
                CheckGateway(context, element, id);
            }
        }

        CheckDataTypeTaskIds(context, metadataFile, metadata.StatelessFolder, process, taskIds);
    }

    private static void CheckTask(Context context, XElement task, string taskId, XElement taskExtension)
    {
        // Compared as written, like the runtime, which resolves the task's implementation by exact type. The rules
        // below follow what the built-in implementation of each type stores.
        var taskType = taskExtension.Element(ProcessFile.TaskType)?.Value;
        foreach (var reference in _taskReferences)
        {
            ReportUnknownDataTypes(context, taskId, taskType, taskExtension, reference);
        }

        CheckDataTypesToSign(context, taskId, taskType, taskExtension);

        switch (taskType)
        {
            case "pdf":
                CheckPdfDataType(context, task, taskId, taskType, "every time the task runs");
                break;
            // The task stores a PDF per data element of its subform data type, so without a data type the app
            // declares it stores nothing. ALTINNAPP1013 reports an unknown id.
            case SubformPdfTaskType:
                if (
                    Follow(taskExtension, _subformDataTypeId).FirstOrDefault() is { } subformDataTypeId
                    && context.DataTypes.Find(subformDataTypeId.Value) is not null
                )
                {
                    CheckPdfDataType(context, task, taskId, taskType, "whenever an instance has a subform to print");
                }

                break;
            case "signing":
                CheckSigningDataTypes(context, taskId, taskExtension);
                break;
            case "payment":
                CheckPaymentDataTypes(context, taskId, taskExtension);
                break;
        }
    }

    /// <summary>
    /// SigningUserAction signs the data types whose id matches an entry ignoring case, and fails only when none does
    /// (GetDataTypeForSignature). The signing view lists the documents to sign by exact id (SigningController).
    /// </summary>
    private static void CheckDataTypesToSign(Context context, string taskId, string? taskType, XElement taskExtension)
    {
        var entries = Follow(taskExtension, _dataTypesToSign).ToList();
        if (!entries.Exists(e => context.DataTypes.FindIgnoringCase(e.Value) is not null))
        {
            // A signing task that names no data type to sign is reported by ALTINNAPP1020 instead.
            if (taskType == SigningTaskType && entries.TrueForAll(e => string.IsNullOrWhiteSpace(e.Value)))
            {
                return;
            }

            foreach (var entry in entries)
            {
                ReportUnknown(context, entry, taskId, _dataTypesToSign);
            }

            return;
        }

        // An entry that matches no data type, a blank one included, is left out.
        foreach (var entry in entries)
        {
            var id = entry.Value;
            if (context.DataTypes.Find(id) is not null)
            {
                continue;
            }

            if (context.DataTypes.FindIgnoringCase(id) is { } match)
            {
                context.Report(
                    Diagnostics.Process.DataTypeIgnored,
                    entry,
                    taskId,
                    Describe(id),
                    ElementPath(_dataTypesToSign),
                    $"the data type's id is '{match.Id}'. The sign action ignores case and signs it, while the "
                        + "signing view matches ids exactly and does not show its documents",
                    $"Change it to '{match.Id}'"
                );
            }
            else
            {
                ReportUnknown(
                    context,
                    entry,
                    taskId,
                    _dataTypesToSign,
                    "the sign action leaves it out of what the user signs"
                );
            }
        }
    }

    /// <summary>
    /// Only an exclusive gateway's connected data type is read (ProcessNavigator); the runtime ignores one on a task.
    /// An empty id is not null, so it skips the fallback to the layout's data type like an unknown one
    /// (ExpressionsExclusiveGateway). The element is bound as nullable, so one marked <c>xsi:nil</c> is null, and
    /// the gateway falls back.
    /// </summary>
    private static void CheckGateway(Context context, XElement gateway, string gatewayId)
    {
        var element = gateway
            .Element(ProcessFile.ExtensionElements)
            ?.Element(_gatewayExtension)
            ?.Element(_connectedDataTypeId);
        if (element is null || IsNil(element) || context.DataTypes.Find(element.Value) is not null)
        {
            return;
        }

        context.Report(Diagnostics.Process.GatewayUnknownDataType, element, gatewayId, Describe(element.Value));
    }

    /// <summary>Whether XmlSerializer reads the element as null: its <c>xsi:nil</c> is the xs:boolean true.</summary>
    private static bool IsNil(XElement element) => element.Attribute(_xsiNil)?.Value.Trim() is "true" or "1";

    /// <summary>
    /// The PDF service tasks store the PDFs they generate through <c>AddBinaryDataElement</c>, which fails for a data
    /// type that is not declared or cannot hold a PDF. The runtime does not create the data type itself.
    /// <paramref name="when"/> says when storing fails.
    /// </summary>
    private static void CheckPdfDataType(Context context, XElement task, string taskId, string taskType, string when)
    {
        var dataType = context.DataTypes.Find(PdfDataType);
        if (dataType is null)
        {
            context.Report(Diagnostics.Process.PdfDataTypeMissing, task, taskId, taskType, when);
            return;
        }

        ReportIfCannotStore(context, task, taskId, "the PDFs it generates", PdfContentType, dataType, when);
    }

    private static void CheckSigningDataTypes(Context context, string taskId, XElement taskExtension)
    {
        if (taskExtension.Element(ProcessFile.Altinn + "signatureConfig") is not { } config)
        {
            return;
        }

        if (Resolve(context, config, "signatureDataType") is (var signature, var signatureDataType))
        {
            // Storage's sign endpoint accepts a signature only when some data type with the id has a taskId that is
            // empty or the current task (ApplicationService.ValidateDataTypeForApp; localtest mirrors Storage), so
            // otherwise every signature in the task is rejected.
            if (
                !context.DataTypes.All.Exists(dataType =>
                    dataType.Id == signatureDataType.Id
                    && (string.IsNullOrEmpty(dataType.TaskId) || dataType.TaskId == taskId)
                )
            )
            {
                context.Report(
                    Diagnostics.Process.DataTypeCannotHoldTaskData,
                    signature,
                    taskId,
                    "its signatures",
                    signatureDataType.Id,
                    $"the data type's taskId is '{signatureDataType.TaskId}', and Storage accepts a signature only in "
                        + "a data type whose taskId is empty or the signing task, so every signature fails",
                    $"Set its taskId to '{taskId}', or remove the taskId"
                );
            }

            ReportIfNotAppOwned(context, signature, taskId, "its signatures", signatureDataType);
        }

        if (Resolve(context, config, "signeeStatesDataTypeId") is (var signeeStates, var signeeStatesDataType))
        {
            // SigningProcessTask stores the signee states only when a signee provider is configured as well. It
            // checks the provider for null, so an empty element counts as configured.
            if (config.Element(ProcessFile.Altinn + "signeeProviderId") is not null)
            {
                ReportIfCannotStore(
                    context,
                    signeeStates,
                    taskId,
                    "its signee states",
                    JsonContentType,
                    signeeStatesDataType
                );
            }

            ReportIfNotAppOwned(context, signeeStates, taskId, "its signee states", signeeStatesDataType);
        }

        if (Resolve(context, config, "signingPdfDataType") is (var signingPdf, var signingPdfDataType))
        {
            ReportIfCannotStore(context, signingPdf, taskId, "its signing PDF", PdfContentType, signingPdfDataType);
        }
    }

    private static void CheckPaymentDataTypes(Context context, string taskId, XElement taskExtension)
    {
        if (taskExtension.Element(ProcessFile.Altinn + "paymentConfig") is not { } config)
        {
            return;
        }

        // The payment information is written through the data client (DataService.InsertJsonObject) rather than
        // AddBinaryDataElement, so only its ownership is checked here.
        if (Resolve(context, config, "paymentDataType") is (var payment, var paymentDataType))
        {
            ReportIfNotAppOwned(context, payment, taskId, "its payment information", paymentDataType);
        }

        if (Resolve(context, config, "paymentReceiptPdfDataType") is (var receipt, var receiptDataType))
        {
            ReportIfCannotStore(context, receipt, taskId, "the payment receipt", PdfContentType, receiptDataType);
        }
    }

    /// <summary>
    /// Mirrors the checks in <c>InstanceDataUnitOfWork.AddBinaryDataElement</c>, in its order: a data type with a
    /// classRef holds a data model rather than files, and a non-empty allowedContentTypes must list the content
    /// type exactly. Its maxSize depends on the file, so it is left alone.
    /// </summary>
    private static void ReportIfCannotStore(
        Context context,
        XElement anchor,
        string taskId,
        string what,
        string contentType,
        MetadataDataType dataType,
        string when = "every time"
    )
    {
        string reason;
        string fix;
        if (dataType.HasClassRef)
        {
            reason =
                "the data type has an appLogic.classRef, which makes it a form data model rather than a file, so "
                + $"storing fails {when}";
            fix = "Remove the appLogic.classRef, or use a data type without one";
        }
        else if (dataType.AllowedContentTypes is { Count: > 0 } allowed && !allowed.Contains(contentType))
        {
            reason = $"the data type's allowedContentTypes does not include '{contentType}', so storing fails {when}";
            fix = $"Add '{contentType}' to its allowedContentTypes";
        }
        else
        {
            return;
        }

        context.Report(
            Diagnostics.Process.DataTypeCannotHoldTaskData,
            anchor,
            taskId,
            $"{what} as '{contentType}'",
            dataType.Id,
            reason,
            fix
        );
    }

    /// <summary>
    /// Mirrors <c>AllowedContributorsHelper.EnsureDataTypeIsAppOwned</c>, which the signing and payment tasks run at
    /// startup in Development only.
    /// </summary>
    private static void ReportIfNotAppOwned(
        Context context,
        XElement anchor,
        string taskId,
        string what,
        MetadataDataType dataType
    )
    {
        if (dataType.AllowedContributors is { Count: 1 } contributors && contributors[0] == AppOwned)
        {
            return;
        }

        context.Report(Diagnostics.Process.DataTypeNotAppOwned, anchor, taskId, what, dataType.Id);
    }

    /// <summary>
    /// Only a <c>bpmn:task</c> or <c>bpmn:serviceTask</c> directly in the process becomes the current task, which is
    /// what the runtime compares a data type's taskId with, exactly (DataElementAccessChecker, the validators). An
    /// empty taskId is a taskId too, which no task has.
    /// </summary>
    private static void CheckDataTypeTaskIds(
        Context context,
        AdditionalText metadataFile,
        string? statelessFolder,
        XElement process,
        HashSet<string> taskIds
    )
    {
        foreach (var dataType in context.DataTypes.All)
        {
            if (dataType.TaskId is not { } taskId || taskIds.Contains(taskId))
            {
                continue;
            }

            // A stateless app finds the data model of the folder it shows by a taskId that names that folder, when
            // the folder's Settings.json has no defaultDataType (HomeController.GetStatelessDataType).
            if (taskId == statelessFolder && dataType.HasClassRef)
            {
                continue;
            }

            context.Output.Add(
                Diagnostic.Create(
                    Diagnostics.Process.DataTypeTaskNotFound,
                    FileLocationHelper.GetLocation(metadataFile, dataType.TaskIdStart, dataType.TaskIdEnd),
                    dataType.Id,
                    taskId,
                    WhyNotATask(process, taskId)
                )
            );
        }
    }

    private static string WhyNotATask(XElement process, string taskId)
    {
        if (taskId.Length == 0)
        {
            return "no task has an empty id";
        }

        var other = process.Descendants().FirstOrDefault(e => e.Attribute("id")?.Value == taskId);
        if (other is null || other.Name.Namespace != ProcessFile.Bpmn)
        {
            return "process.bpmn has no task with that id";
        }

        // The runtime reads only the elements directly in the process (Process in Altinn.App.Core), and every task
        // there is a task id already, so this one is nested.
        if (
            (other.Name == ProcessFile.Task || other.Name == ProcessFile.ServiceTask)
            && other.Parent is { Name: var parent }
        )
        {
            var parentName = parent.Namespace == ProcessFile.Bpmn ? $"bpmn:{parent.LocalName}" : parent.LocalName;
            return $"'{taskId}' is a <bpmn:{other.Name.LocalName}> inside a <{parentName}> in process.bpmn, which the "
                + "app does not run";
        }

        return $"'{taskId}' is a <bpmn:{other.Name.LocalName}> in process.bpmn, not a task";
    }

    /// <summary>
    /// Reports each data type id that <paramref name="reference"/> finds under <paramref name="taskExtension"/> and
    /// no data type has.
    /// </summary>
    private static void ReportUnknownDataTypes(
        Context context,
        string taskId,
        string? taskType,
        XElement taskExtension,
        TaskReference reference
    )
    {
        var skipped = taskType is not null && taskType == reference.FailsInTaskType ? null : reference.Skipped;
        var skipBlank = reference.SkipBlank || (taskType is not null && taskType == reference.BlankIsMissingIn);
        foreach (var element in Follow(taskExtension, reference.Path))
        {
            var dataTypeId = element.Value;
            if ((skipBlank && string.IsNullOrWhiteSpace(dataTypeId)) || context.DataTypes.Find(dataTypeId) is not null)
            {
                continue;
            }

            ReportUnknown(context, element, taskId, reference.Path, skipped);
        }
    }

    /// <summary>
    /// Reports a task's reference to a data type that applicationmetadata.json does not declare: through
    /// ALTINNAPP1013 when that fails, or through ALTINNAPP1018 with what the app <paramref name="skipped"/> instead.
    /// </summary>
    private static void ReportUnknown(
        Context context,
        XElement element,
        string taskId,
        string[] path,
        string? skipped = null
    )
    {
        var dataType = Describe(element.Value);
        if (skipped is null)
        {
            context.Report(Diagnostics.Process.UnknownDataType, element, taskId, dataType, ElementPath(path));
            return;
        }

        context.Report(
            Diagnostics.Process.DataTypeIgnored,
            element,
            taskId,
            dataType,
            ElementPath(path),
            $"no entry in 'dataTypes' in applicationmetadata.json has that id, so {skipped}",
            "Correct the id, or add the data type"
        );
    }

    /// <summary>How a message names a data type id: quoted, or as empty.</summary>
    private static string Describe(string dataTypeId) =>
        string.IsNullOrWhiteSpace(dataTypeId) ? "an empty data type id" : $"the data type '{dataTypeId}'";

    private static string ElementPath(string[] path) => string.Concat(path.Select(ProcessFile.Tag));

    /// <summary>
    /// The first <paramref name="name"/> element under <paramref name="config"/>, the one the runtime reads, and the
    /// data type it names; null when there is none or no data type has the id.
    /// </summary>
    private static (XElement Element, MetadataDataType DataType)? Resolve(
        Context context,
        XElement config,
        string name
    ) =>
        config.Element(ProcessFile.Altinn + name) is { } element
        && context.DataTypes.Find(element.Value) is { } dataType
            ? (element, dataType)
            : null;

    /// <summary>
    /// The elements the runtime reads along <paramref name="path"/>: every occurrence of a list element
    /// (<see cref="_listElements"/>), and the first of any other.
    /// </summary>
    private static IEnumerable<XElement> Follow(XElement parent, string[] path)
    {
        IEnumerable<XElement> current = [parent];
        foreach (var name in path)
        {
            var elementName = ProcessFile.Altinn + name;
            current = _listElements.Contains(name)
                ? current.Elements(elementName)
                : current.Select(e => e.Element(elementName)).OfType<XElement>();
        }

        return current;
    }

    /// <param name="Path">The elements from <c>altinn:taskExtension</c> to the one that names the data type.</param>
    /// <param name="SkipBlank">
    /// Whether a blank id is left alone, because the runtime rejects it as missing before it looks it up.
    /// </param>
    /// <param name="Skipped">
    /// What the app skips when the id is unknown, for a reference that fails nothing; null when an unknown id fails.
    /// </param>
    /// <param name="FailsInTaskType">
    /// The task type in which an unknown id fails after all, so it is reported as one that fails rather than as
    /// <paramref name="Skipped"/>.
    /// </param>
    /// <param name="BlankIsMissingIn">
    /// The task type whose blank id ALTINNAPP1020 reports as a missing setting, so it is left alone here.
    /// </param>
    private sealed record TaskReference(
        string[] Path,
        bool SkipBlank,
        string? Skipped = null,
        string? FailsInTaskType = null,
        string? BlankIsMissingIn = null
    );

    private sealed class Context(
        AdditionalText processFile,
        string processContent,
        MetadataDataTypes dataTypes,
        List<Diagnostic> diagnostics
    )
    {
        internal MetadataDataTypes DataTypes { get; } = dataTypes;

        internal List<Diagnostic> Output { get; } = diagnostics;

        /// <summary>Reports a diagnostic on the opening tag of a process.bpmn element.</summary>
        internal void Report(DiagnosticDescriptor descriptor, XElement element, params object[] args) =>
            Output.Add(
                Diagnostic.Create(
                    descriptor,
                    FileLocationHelper.GetXmlElementLocation(processFile, processContent, element),
                    args
                )
            );
    }
}
