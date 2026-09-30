using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// What a task's legacy PDF was rendered from, which decides how its PDF service task must render.
/// </summary>
internal abstract record SourceTaskPdfLayout
{
    /// <summary>
    /// The task's settings name no <c>pages.pdfLayoutName</c>: the legacy PDF showed the task's pages in
    /// summary mode, which is what a PDF service task with <c>autoPdfTaskIds</c> renders.
    /// </summary>
    public sealed record Automatic : SourceTaskPdfLayout;

    /// <summary>
    /// The settings in the task folder <paramref name="UiFolder"/> name the custom layout
    /// <paramref name="PdfLayoutName"/>, which the legacy PDF rendered instead of the task's pages. The
    /// PDF service task renders it from a copy of the task folder in <paramref name="PdfTaskUiFolder"/>.
    /// </summary>
    public sealed record Custom(string UiFolder, string PdfTaskUiFolder, string PdfLayoutName) : SourceTaskPdfLayout;

    /// <summary>
    /// The task's PDF cannot be migrated automatically. <paramref name="Reason"/> says why and what to do.
    /// </summary>
    public sealed record Unresolved(string Reason) : SourceTaskPdfLayout;
}

/// <summary>
/// Finds the UI settings a task's legacy PDF was rendered with. The legacy PDF was generated while the
/// data task was the current task, so the frontend rendered it from that task's UI settings, honoring
/// <c>pages.pdfLayoutName</c>.
///
/// This job runs after the layout-set migration, so the settings are in the task folder
/// (<c>ui/&lt;taskId&gt;/Settings.json</c>) - unless that migration was held back, in which case
/// <c>layout-sets.json</c> still maps the task to its layout set folder.
/// </summary>
internal sealed class SourceTaskPdfLayoutResolver
{
    private const string LayoutSetsFileName = "layout-sets.json";
    private const string SettingsFileName = "Settings.json";

    private static readonly JsonDocumentOptions _jsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly string _projectFolder;
    private readonly string? _uiFolder;

    public SourceTaskPdfLayoutResolver(string projectFolder)
    {
        _projectFolder = projectFolder;
        // The same two locations the layout-set migration accepts.
        _uiFolder = Array.Find(
            [Path.Combine(projectFolder, "App", "ui"), Path.Combine(projectFolder, "ui")],
            Directory.Exists
        );
    }

    /// <summary>A path as the upgrade reports it: relative to the project folder, with forward slashes.</summary>
    public string DisplayPath(string path) => Path.GetRelativePath(_projectFolder, path).Replace('\\', '/');

    public SourceTaskPdfLayout Resolve(string taskId)
    {
        // A task id that is not a plain folder name cannot have a task folder (and must not be used to
        // build paths to copy from or to).
        if (_uiFolder is not { } uiFolder || !IsPlainFolderName(taskId))
            return new SourceTaskPdfLayout.Automatic();

        var layoutSetsFile = Path.Combine(uiFolder, LayoutSetsFileName);
        return File.Exists(layoutSetsFile)
            ? ResolveFromLayoutSets(uiFolder, layoutSetsFile, taskId)
            : ResolveFromFolder(uiFolder, taskId, taskId);
    }

    /// <summary>
    /// The layout-set migration was held back, so the task's UI is still in a v8 layout set. A custom
    /// layout cannot be copied for the PDF service task until that migration has moved it to a task folder.
    /// </summary>
    private SourceTaskPdfLayout ResolveFromLayoutSets(string uiFolder, string layoutSetsFile, string taskId)
    {
        string? layoutSetId;
        try
        {
            layoutSetId = FindLayoutSetForTask(layoutSetsFile, taskId);
        }
        catch (JsonException ex)
        {
            return Unreadable(layoutSetsFile, taskId, ex);
        }

        if (layoutSetId is null || !IsPlainFolderName(layoutSetId))
            return new SourceTaskPdfLayout.Automatic();

        var layout = ResolveFromFolder(uiFolder, layoutSetId, taskId);
        if (layout is not SourceTaskPdfLayout.Custom custom)
            return layout;

        return new SourceTaskPdfLayout.Unresolved(
            $"Task '{taskId}' renders its PDF from the custom layout '{custom.PdfLayoutName}' (pages.pdfLayoutName "
                + $"in layout set '{layoutSetId}'), and its PDF service task needs a layout set of its own, made "
                + "from the task's folder. Layout sets have not been moved to task folders yet, so skipped PDF "
                + "service task insertion - finish the layout-set migration and re-run the upgrade."
        );
    }

    private SourceTaskPdfLayout ResolveFromFolder(string uiFolder, string folderName, string taskId)
    {
        var folder = Path.Combine(uiFolder, folderName);
        var settingsFile = Path.Combine(folder, SettingsFileName);
        if (!File.Exists(settingsFile))
            return new SourceTaskPdfLayout.Automatic();

        try
        {
            using var settings = JsonDocument.Parse(File.ReadAllText(settingsFile), _jsonOptions);
            if (
                settings.RootElement.ValueKind != JsonValueKind.Object
                || !settings.RootElement.TryGetProperty("pages", out var pages)
                || pages.ValueKind != JsonValueKind.Object
                || !pages.TryGetProperty("pdfLayoutName", out var pdfLayoutName)
            )
            {
                return new SourceTaskPdfLayout.Automatic();
            }

            // The frontend renders the custom layout whenever pdfLayoutName is set to a non-empty value.
            return pdfLayoutName.ValueKind switch
            {
                JsonValueKind.String when pdfLayoutName.GetString() is { Length: > 0 } name =>
                    new SourceTaskPdfLayout.Custom(
                        folder,
                        Path.Combine(uiFolder, PdfProcessRewriter.PdfTaskIdFor(taskId)),
                        name
                    ),
                JsonValueKind.String or JsonValueKind.Null => new SourceTaskPdfLayout.Automatic(),
                _ => new SourceTaskPdfLayout.Unresolved(
                    $"pages.pdfLayoutName in {DisplayPath(settingsFile)} is not a string, so it is unknown which "
                        + $"layout task '{taskId}' renders its PDF from. Skipped PDF service task insertion - set it "
                        + "to the name of the PDF layout (or remove it) and re-run the upgrade."
                ),
            };
        }
        catch (JsonException ex)
        {
            return Unreadable(settingsFile, taskId, ex);
        }
    }

    private static bool IsPlainFolderName(string name) =>
        name.Length > 0 && name is not ("." or "..") && name.IndexOfAny(['/', '\\']) < 0;

    private SourceTaskPdfLayout.Unresolved Unreadable(string file, string taskId, JsonException ex) =>
        new(
            $"{DisplayPath(file)} is not valid JSON ({ex.Message}), so it is unknown whether task '{taskId}' "
                + "renders its PDF from a custom layout (pages.pdfLayoutName). Skipped PDF service task "
                + "insertion - fix the file and re-run the upgrade."
        );

    /// <summary>
    /// The id of the first layout set whose <c>tasks</c> include <paramref name="taskId"/>, which is the
    /// set the v8 frontend rendered the task with; null when no set does.
    /// </summary>
    private static string? FindLayoutSetForTask(string layoutSetsFile, string taskId)
    {
        using var layoutSets = JsonDocument.Parse(File.ReadAllText(layoutSetsFile), _jsonOptions);
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
                return id.GetString();
            }
        }

        return null;
    }
}
