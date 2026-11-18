using System.Text.Json;
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
/// What creates the elements of a data type besides <c>appLogic.autoCreate</c>, which v8 made a task's PDF only
/// for when the instance had one (see <see cref="ApplicationMetadataPdfRewriter"/>): the app's code (see
/// <see cref="DataElementCreationDetector"/>), a Subform component, which creates entries of the data type of the
/// layout set it names, and a payment or signing task, which creates elements of the data types its configuration
/// names. The v4 frontend creates no other form data elements.
/// </summary>
internal sealed class DataElementCreators
{
    private readonly DataElementCreations _code;
    private readonly IReadOnlySet<string> _subforms;
    private readonly IReadOnlySet<string> _tasks;

    private DataElementCreators(DataElementCreations code, IReadOnlySet<string> subforms, IReadOnlySet<string> tasks)
    {
        _code = code;
        _subforms = subforms;
        _tasks = tasks;
    }

    /// <param name="projectFolder">The app's folder.</param>
    /// <param name="code">The app's C# source, on the view that binds against v8.</param>
    /// <param name="createdByTasks">The data types the process's tasks create elements of.</param>
    public static DataElementCreators Find(
        string projectFolder,
        CSharpSourceScanner code,
        IReadOnlySet<string> createdByTasks
    ) => new(new DataElementCreationDetector(code).Detect(), SubformDataTypes(projectFolder), createdByTasks);

    /// <summary>
    /// The calls in the app's code that create elements of a data type it does not name with a constant.
    /// </summary>
    public IReadOnlyList<CSharpApiMatch> UnknownCreations => _code.UnknownDataTypes;

    public DataElementCreation Of(string dataTypeId)
    {
        if (_code.DataTypes.Contains(dataTypeId) || _subforms.Contains(dataTypeId) || _tasks.Contains(dataTypeId))
            return DataElementCreation.Created;

        return _code.UnknownDataTypes.Count > 0 ? DataElementCreation.Unknown : DataElementCreation.None;
    }

    /// <summary>
    /// The data types of the layout sets Subform components name: the <c>dataType</c> in layout-sets.json, or, once
    /// the layout-set migration has moved the layout sets to folders, the <c>defaultDataType</c> in the folder's
    /// settings.
    /// </summary>
    private static HashSet<string> SubformDataTypes(string projectFolder)
    {
        var dataTypes = new HashSet<string>(StringComparer.Ordinal);
        if (new TaskUiSettings(projectFolder).UiFolder is not { } uiFolder)
            return dataTypes;

        var layoutSets = ReadLayoutSets(Path.Combine(uiFolder, TaskUiSettings.LayoutSetsFileName));
        foreach (var layoutSet in LayoutSetsToTaskUiMigrator.CollectSubformLayoutSetReferences(uiFolder))
        {
            var dataType = layoutSets is null
                ? ReadString(Path.Combine(uiFolder, layoutSet, TaskUiSettings.SettingsFileName), "defaultDataType")
                : layoutSets.GetValueOrDefault(layoutSet);
            if (dataType is not null)
                dataTypes.Add(dataType);
        }

        return dataTypes;
    }

    /// <summary>
    /// The data type of each layout set in layout-sets.json; null when the file is missing or unreadable.
    /// </summary>
    private static Dictionary<string, string>? ReadLayoutSets(string file)
    {
        if (!File.Exists(file))
            return null;

        var dataTypes = new Dictionary<string, string>(StringComparer.Ordinal);
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(file), TaskUiSettings.JsonOptions);
            if (
                doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("sets", out var sets)
                || sets.ValueKind != JsonValueKind.Array
            )
            {
                return dataTypes;
            }

            foreach (var set in sets.EnumerateArray())
            {
                if (
                    set.ValueKind == JsonValueKind.Object
                    && StringProperty(set, "id") is { } id
                    && StringProperty(set, "dataType") is { } dataType
                )
                {
                    dataTypes.TryAdd(id, dataType);
                }
            }
        }
        catch (JsonException)
        {
            // The layout-set migration reports an unreadable layout-sets.json.
        }

        return dataTypes;
    }

    private static string? ReadString(string file, string property)
    {
        if (!File.Exists(file))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(file), TaskUiSettings.JsonOptions);
            return doc.RootElement.ValueKind == JsonValueKind.Object ? StringProperty(doc.RootElement, property) : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? StringProperty(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;

        return value.GetString() is { Length: > 0 } text ? text : null;
    }
}
