using System.Text.Json;
using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using LayoutSetsToTaskUiMigrator = Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration.LayoutSetsToTaskUiMigrator;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>Whether anything in the app creates elements of a data type.</summary>
internal enum DataElementCreation
{
    Created,

    /// <summary>The app's code creates elements of a data type it does not name with a constant.</summary>
    Unknown,

    None,
}

/// <summary>
/// What creates the elements of a data type in a v8 app, which v8 made a task's PDF only for when the instance had
/// one (see <see cref="ApplicationMetadataPdfRewriter"/>):
/// <list type="bullet">
/// <item>the backend, for a data type with <c>appLogic.autoCreate</c>, one another data type saves its shadow
/// fields to (<c>appLogic.shadowFields.saveToDataType</c>), and a payment task's <c>paymentDataType</c></item>
/// <item>a Subform component, which creates entries of the data type of the layout set it names</item>
/// <item>the app's code (see <see cref="DataElementCreationDetector"/>)</item>
/// </list>
/// This assumes the v8 app frontend (v4) creates no other form data elements.
/// </summary>
internal sealed class DataElementCreators
{
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    private readonly HashSet<string> _created;
    private readonly CodeCreatedDataTypes _code;

    private DataElementCreators(HashSet<string> created, CodeCreatedDataTypes code)
    {
        _created = created;
        _code = code;
    }

    /// <param name="projectFolder">The app's folder.</param>
    /// <param name="code">The app's C# source.</param>
    /// <param name="metadata">The content of applicationmetadata.json.</param>
    /// <param name="process">process.bpmn.</param>
    public static DataElementCreators Find(
        string projectFolder,
        CSharpSourceScanner code,
        JsonElement metadata,
        XDocument process
    )
    {
        var codeCreated = new DataElementCreationDetector(code).Detect();
        HashSet<string> created =
        [
            .. CreatedByBackend(metadata),
            .. PaymentDataTypes(process),
            .. SubformDataTypes(projectFolder),
            .. codeCreated.DataTypes,
        ];
        return new DataElementCreators(created, codeCreated);
    }

    /// <summary>
    /// The calls in the app's code that create elements of a data type it does not name with a constant.
    /// </summary>
    public IReadOnlyList<CSharpApiMatch> UnknownCreations => _code.UnknownDataTypes;

    public DataElementCreation Of(string dataTypeId)
    {
        if (_created.Contains(dataTypeId))
            return DataElementCreation.Created;

        return _code.UnknownDataTypes.Count > 0 ? DataElementCreation.Unknown : DataElementCreation.None;
    }

    /// <summary>
    /// The data types the backend creates from applicationmetadata.json: with <c>appLogic.autoCreate</c> when their
    /// task starts, and those another data type saves its shadow fields to when its task ends. Property names match
    /// in any case, as v8 reads the file with Newtonsoft.
    /// </summary>
    private static IEnumerable<string> CreatedByBackend(JsonElement metadata)
    {
        if (
            metadata.ValueKind != JsonValueKind.Object
            || !metadata.TryGetProperty("dataTypes", out var dataTypes)
            || dataTypes.ValueKind != JsonValueKind.Array
        )
        {
            yield break;
        }

        foreach (var dataType in dataTypes.EnumerateArray())
        {
            if (
                dataType.ValueKind != JsonValueKind.Object
                || !ApplicationMetadataPdfRewriter.TryGetPropertyIgnoreCase(dataType, "appLogic", out var appLogic)
                || appLogic.ValueKind != JsonValueKind.Object
            )
            {
                continue;
            }

            if (
                ApplicationMetadataPdfRewriter.TryGetPropertyIgnoreCase(appLogic, "autoCreate", out var autoCreate)
                && autoCreate.ValueKind == JsonValueKind.True
                && StringProperty(dataType, "id") is { } id
            )
            {
                yield return id;
            }

            if (
                ApplicationMetadataPdfRewriter.TryGetPropertyIgnoreCase(appLogic, "shadowFields", out var shadowFields)
                && shadowFields.ValueKind == JsonValueKind.Object
                && ApplicationMetadataPdfRewriter.TryGetPropertyIgnoreCase(
                    shadowFields,
                    "saveToDataType",
                    out var saveTo
                )
                && saveTo.ValueKind == JsonValueKind.String
                && saveTo.GetString() is { Length: > 0 } target
            )
            {
                yield return target;
            }
        }
    }

    /// <summary>The <c>paymentDataType</c> of each payment task, whose element the payment creates.</summary>
    private static IEnumerable<string> PaymentDataTypes(XDocument process) =>
        process
            .Root?.Elements()
            .Where(e => e.Name.LocalName == "process")
            .SelectMany(p => p.Elements())
            .Where(e => e.Name.LocalName is "task" or "serviceTask")
            .Select(task =>
                task.Elements()
                    .FirstOrDefault(e => e.Name.LocalName == "extensionElements")
                    ?.Element(_altinnNs + "taskExtension")
            )
            .Where(extension => extension?.Element(_altinnNs + "taskType")?.Value.Trim() == "payment")
            .Select(extension =>
                extension?.Element(_altinnNs + "paymentConfig")?.Element(_altinnNs + "paymentDataType")?.Value.Trim()
            )
            .OfType<string>()
            .Where(dataType => dataType.Length > 0)
        ?? [];

    /// <summary>The data types of the layout sets Subform components name.</summary>
    private static IEnumerable<string> SubformDataTypes(string projectFolder)
    {
        var taskUiSettings = new TaskUiSettings(projectFolder);
        if (taskUiSettings.UiFolder is not { } uiFolder)
            return [];

        // An unreadable file is reported by the layout-set migration.
        return LayoutSetsToTaskUiMigrator
            .CollectSubformLayoutSetReferences(uiFolder)
            .Select(layoutSet => taskUiSettings.FindDataTypeForLayoutSet(layoutSet, _ => { }))
            .OfType<string>();
    }

    private static string? StringProperty(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
