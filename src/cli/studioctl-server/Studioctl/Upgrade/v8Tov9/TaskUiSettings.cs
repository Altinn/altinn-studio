using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Finds a task's UI settings for the steps that run after the layout-set migration: in the task folder
/// (<c>ui/&lt;taskId&gt;/Settings.json</c>) that migration made, or, when it was held back, in the layout set
/// <c>layout-sets.json</c> still maps the task to.
/// </summary>
internal sealed class TaskUiSettings
{
    public const string LayoutSetsFileName = "layout-sets.json";
    public const string SettingsFileName = "Settings.json";

    public static readonly JsonDocumentOptions JsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly string _projectFolder;

    public TaskUiSettings(string projectFolder)
    {
        _projectFolder = projectFolder;
        // The same two locations the layout-set migration accepts.
        UiFolder = Array.Find(
            [Path.Combine(projectFolder, "App", "ui"), Path.Combine(projectFolder, "ui")],
            Directory.Exists
        );
    }

    /// <summary>The app's ui folder; null when it has none.</summary>
    public string? UiFolder { get; }

    /// <summary>A path as the upgrade reports it: relative to the project folder, with forward slashes.</summary>
    public string DisplayPath(string path) => Path.GetRelativePath(_projectFolder, path).Replace('\\', '/');

    /// <summary>
    /// The data model the task's UI settings name: <c>defaultDataType</c> in the task folder, where the layout-set
    /// migration moves the layout set's <c>dataType</c>, or else the <c>dataType</c> of the task's layout set; null
    /// when neither names one. A file that is not valid JSON is passed to <paramref name="reportUnreadable"/> and
    /// skipped.
    /// </summary>
    public string? FindDataTypeForTask(string taskId, Action<string> reportUnreadable)
    {
        if (UiFolder is not { } uiFolder)
            return null;

        var settingsFile = Path.Combine(uiFolder, taskId, SettingsFileName);
        if (IsPlainFolderName(taskId) && File.Exists(settingsFile))
        {
            try
            {
                using var settings = JsonDocument.Parse(File.ReadAllText(settingsFile), JsonOptions);
                if (
                    settings.RootElement.ValueKind == JsonValueKind.Object
                    && settings.RootElement.TryGetProperty("defaultDataType", out var defaultDataType)
                    && NonBlankString(defaultDataType) is { } dataType
                )
                {
                    return dataType;
                }
            }
            catch (JsonException ex)
            {
                reportUnreadable(Unreadable(settingsFile, taskId, ex));
            }
        }

        var layoutSetsFile = Path.Combine(uiFolder, LayoutSetsFileName);
        if (!File.Exists(layoutSetsFile))
            return null;

        try
        {
            return FindLayoutSetForTask(layoutSetsFile, taskId)?.DataType;
        }
        catch (JsonException ex)
        {
            reportUnreadable(Unreadable(layoutSetsFile, taskId, ex));
            return null;
        }
    }

    /// <summary>Whether a path built from <paramref name="name"/> stays a folder directly in the ui folder.</summary>
    public static bool IsPlainFolderName(string name) =>
        name.Length > 0 && name is not ("." or "..") && name.IndexOfAny(['/', '\\']) < 0;

    /// <summary>
    /// The id and data model of the first layout set whose <c>tasks</c> include <paramref name="taskId"/>, which is
    /// the set the v8 frontend rendered the task with; null when no set does.
    /// </summary>
    public static (string? Id, string? DataType)? FindLayoutSetForTask(string layoutSetsFile, string taskId)
    {
        using var layoutSets = JsonDocument.Parse(File.ReadAllText(layoutSetsFile), JsonOptions);
        if (
            layoutSets.RootElement.ValueKind != JsonValueKind.Object
            || !layoutSets.RootElement.TryGetProperty("sets", out var sets)
            || sets.ValueKind != JsonValueKind.Array
        )
        {
            return null;
        }

        foreach (var set in sets.EnumerateArray())
        {
            if (
                set.ValueKind == JsonValueKind.Object
                && set.TryGetProperty("id", out var id)
                && id.ValueKind == JsonValueKind.String
                && set.TryGetProperty("tasks", out var tasks)
                && tasks.ValueKind == JsonValueKind.Array
                && tasks.EnumerateArray().Any(t => t.ValueKind == JsonValueKind.String && t.GetString() == taskId)
            )
            {
                var dataType = set.TryGetProperty("dataType", out var dataTypeValue)
                    ? NonBlankString(dataTypeValue)
                    : null;
                return (id.GetString(), dataType);
            }
        }

        return null;
    }

    private static string? NonBlankString(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && !string.IsNullOrWhiteSpace(text)
            ? text
            : null;

    private string Unreadable(string file, string taskId, JsonException ex) =>
        $"{DisplayPath(file)} is not valid JSON ({ex.Message}), so the data model of task '{taskId}' was not read "
        + "from it.";
}
