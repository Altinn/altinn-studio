using System.Text;
using System.Text.Json;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>A data type of the app, as <c>config/applicationmetadata.json</c> declares it.</summary>
/// <param name="TaskIds">
/// The tasks the data type is bound to: its <c>taskIds</c>, or the v8 <c>taskId</c>, which the upgrade turns into them;
/// empty when it is bound to none. v9 refuses a write to an element of a bound type while no task it lists is current.
/// </param>
/// <param name="AutoCreate">
/// Whether the engine creates the form when its task starts, which runs <c>IInstantiationProcessor.DataCreation</c>
/// inside the process transition rather than in an ordinary request.
/// </param>
/// <param name="EnablePdfCreation">Whether the type's form goes into the PDF of its tasks; Storage's default is true.</param>
/// <param name="AutoDeleteOnProcessEnd">Whether the engine deletes the type's elements when the process ends.</param>
internal sealed record DataTypeInfo(
    string Id,
    string? ClassRef,
    IReadOnlyList<string> TaskIds,
    IReadOnlyList<string> DataFields,
    IReadOnlyList<string> PresentationFields,
    bool AutoCreate,
    bool EnablePdfCreation,
    bool AutoDeleteOnProcessEnd
);

/// <summary>
/// What the hook port needs to know about the app beyond its C# code, read from its configuration files.
/// </summary>
/// <param name="ProjectFolder">The folder of the app's project file, which holds <c>config/</c>.</param>
/// <param name="AppId">The app's <c>org/app</c> id, or the folder name when the metadata has none.</param>
/// <param name="BpmnTaskIds">The ids of the process's tasks; empty when the process cannot be read.</param>
/// <param name="BpmnTaskTypes">The <c>altinn:taskType</c> of each task that has one, by task id.</param>
/// <param name="PackageVersions">
/// The <c>Version</c> of each <c>PackageReference</c> in the project files of <paramref name="ProjectFolder"/>, by
/// package id.
/// </param>
internal sealed record ProcessHookPortContext(
    string ProjectFolder,
    string AppId,
    IReadOnlySet<string> BpmnTaskIds,
    IReadOnlyDictionary<string, string> BpmnTaskTypes,
    IReadOnlyDictionary<string, DataTypeInfo> DataTypes,
    IReadOnlyDictionary<string, string> PackageVersions
)
{
    private static readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    private static readonly JsonDocumentOptions _jsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// Reads the context of the app in <paramref name="projectFolder"/>. A file that is missing or cannot be read
    /// leaves its part empty: the port then treats every task as possible.
    /// </summary>
    public static ProcessHookPortContext Read(string projectFolder)
    {
        var (appId, dataTypes) = ReadMetadata(Path.Combine(projectFolder, "config", "applicationmetadata.json"));
        var (tasks, taskTypes) = ReadProcess(Path.Combine(projectFolder, "config", "process", "process.bpmn"));
        return new ProcessHookPortContext(
            projectFolder,
            appId ?? Path.GetFileName(Path.TrimEndingDirectorySeparator(projectFolder)),
            tasks,
            taskTypes,
            dataTypes,
            ReadPackageVersions(projectFolder)
        );
    }

    /// <summary>
    /// Whether the Altinn.App libraries the upgrade gives the app put the actor who started a transition on the
    /// contexts of hooks, service tasks and <c>DataCreation</c>.
    /// </summary>
    public bool CallbackActorIsKnown { get; init; }

    /// <summary>
    /// <paramref name="package"/> as the reports name it: with the version the app's project file references, or alone
    /// when it gives none, as for a package the app gets through another. Not the assembly version, which says nothing
    /// about the package's (Dibk.Ftpb.Common.AltinnApps 1.7.0 is assembly 0.0.1).
    /// </summary>
    public string PackageName(string package) =>
        PackageVersions.TryGetValue(package, out var version) ? $"{package} {version}" : package;

    private static Dictionary<string, string> ReadPackageVersions(string projectFolder)
    {
        var versions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            foreach (
                var projectFile in Directory.EnumerateFiles(projectFolder, "*.csproj").Order(StringComparer.Ordinal)
            )
            {
                foreach (
                    var reference in XDocument
                        .Parse(Utf8TextFile.Decode(File.ReadAllBytes(projectFile)).Text)
                        .Descendants()
                        .Where(static element => element.Name.LocalName == "PackageReference")
                )
                {
                    if (
                        (string?)reference.Attribute("Include") is { } id
                        && (string?)reference.Attribute("Version") is { } version
                    )
                    {
                        versions.TryAdd(id, version);
                    }
                }
            }
        }
        catch (Exception ex)
            when (ex
                    is IOException
                        or UnauthorizedAccessException
                        or DecoderFallbackException
                        or System.Xml.XmlException
            )
        {
            return versions;
        }

        return versions;
    }

    /// <summary>The process's tasks with their <c>altinn:taskType</c>.</summary>
    private static (HashSet<string> Tasks, Dictionary<string, string> TaskTypes) ReadProcess(string processFile)
    {
        var tasks = new HashSet<string>(StringComparer.Ordinal);
        var taskTypes = new Dictionary<string, string>(StringComparer.Ordinal);
        try
        {
            var document = XDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(processFile)).Text);
            foreach (
                var task in document
                    .Descendants()
                    .Where(static element =>
                        element.Name == _bpmnNs + "task" || element.Name == _bpmnNs + "serviceTask"
                    )
            )
            {
                if ((string?)task.Attribute("id") is not { } id || !tasks.Add(id))
                {
                    continue;
                }

                if (
                    task.Descendants().FirstOrDefault(static element => element.Name.LocalName == "taskType") is
                    { Value: var taskType }
                )
                {
                    taskTypes[id] = taskType.Trim();
                }
            }

            return (tasks, taskTypes);
        }
        catch (Exception ex)
            when (ex
                    is IOException
                        or UnauthorizedAccessException
                        or DecoderFallbackException
                        or System.Xml.XmlException
            )
        {
            return ([], []);
        }
    }

    private static (string? AppId, Dictionary<string, DataTypeInfo> DataTypes) ReadMetadata(string metadataFile)
    {
        var dataTypes = new Dictionary<string, DataTypeInfo>(StringComparer.Ordinal);
        try
        {
            using var document = JsonDocument.Parse(
                Utf8TextFile.Decode(File.ReadAllBytes(metadataFile)).Text,
                _jsonOptions
            );
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return (null, dataTypes);
            }

            var dataFields = FieldIdsByDataType(root, "dataFields");
            var presentationFields = FieldIdsByDataType(root, "presentationFields");
            foreach (var dataType in Array(root, "dataTypes"))
            {
                if (String(dataType, "id") is not { } id)
                {
                    continue;
                }

                var appLogic =
                    dataType.TryGetProperty("appLogic", out var logic) && logic.ValueKind == JsonValueKind.Object
                        ? logic
                        : default;
                var hasLogic = appLogic.ValueKind == JsonValueKind.Object;
                dataTypes[id] = new DataTypeInfo(
                    id,
                    hasLogic ? String(appLogic, "classRef") : null,
                    DataTypeTaskIdsMigration.BoundTasks(dataType),
                    dataFields.GetValueOrDefault(id) ?? [],
                    presentationFields.GetValueOrDefault(id) ?? [],
                    hasLogic && Is(appLogic, "autoCreate", JsonValueKind.True),
                    !Is(dataType, "enablePdfCreation", JsonValueKind.False),
                    hasLogic && Is(appLogic, "autoDeleteOnProcessEnd", JsonValueKind.True)
                );
            }

            return (String(root, "id"), dataTypes);
        }
        catch (Exception ex)
            when (ex is IOException or UnauthorizedAccessException or DecoderFallbackException or JsonException)
        {
            return (null, dataTypes);
        }
    }

    private static bool Is(JsonElement element, string property, JsonValueKind kind) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == kind;

    private static Dictionary<string, List<string>> FieldIdsByDataType(JsonElement root, string property)
    {
        var fields = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var field in Array(root, property))
        {
            if (String(field, "id") is { } id && String(field, "dataTypeId") is { } dataTypeId)
            {
                if (!fields.TryGetValue(dataTypeId, out var ids))
                {
                    fields[dataTypeId] = ids = [];
                }

                ids.Add(id);
            }
        }

        return fields;
    }

    private static IEnumerable<JsonElement> Array(JsonElement element, string property) =>
        element.TryGetProperty(property, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray().Where(static item => item.ValueKind == JsonValueKind.Object)
            : [];

    private static string? String(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
